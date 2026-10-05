import { Response } from 'express';
import { dbStore, syncProductRatingSummary } from '../models/store';
import { ReviewDoc, QuestionDoc } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';

/**
 * Create a Product Review.
 * IMPORTANT: Never trusts `verifiedPurchase` from the client.
 * Queries the user's actual orders in the backend database to verify purchase.
 */
export const createReview = (req: AuthRequest, res: Response) => {
  const { productId, rating, title, comment, photos = [] } = req.body;

  const product = dbStore.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found.', [], 404);
  }

  const numRating = Number(rating);
  if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
    return sendError(res, 'Rating must be between 1 and 5 stars.', [], 400);
  }

  if (!String(title || '').trim() || !String(comment || '').trim()) {
    return sendError(res, 'Review headline and written review are required.', [], 400);
  }

  // Server-authoritative Verified Purchase determination
  const matchingOrder = dbStore.orders.find(
    (o) =>
      o.userId === req.user!.id &&
      ['Delivered', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery'].includes(
        o.orderStatus
      ) &&
      o.items.some((item) => item.productId === product.id)
  );

  const verifiedPurchase = Boolean(matchingOrder);

  const existingReviewIndex = dbStore.reviews.findIndex(
    (r) => r.productId === product.id && r.userId === req.user!.id
  );

  const nowIso = new Date().toISOString();

  if (existingReviewIndex !== -1) {
    dbStore.reviews[existingReviewIndex] = {
      ...dbStore.reviews[existingReviewIndex],
      rating: numRating,
      title: String(title).trim(),
      comment: String(comment).trim(),
      photos: Array.isArray(photos) ? photos.filter(Boolean) : [],
      verifiedPurchase,
      orderId: matchingOrder?.id || dbStore.reviews[existingReviewIndex].orderId,
      updatedAt: nowIso,
    };
    syncProductRatingSummary(product.id);
    return sendSuccess(res, 'Your review has been updated.', {
      review: dbStore.reviews[existingReviewIndex],
    });
  }

  const newReview: ReviewDoc = {
    id: `rev_${Date.now()}`,
    productId: product.id,
    userId: req.user!.id,
    userName: req.user!.name,
    rating: numRating,
    title: String(title).trim(),
    comment: String(comment).trim(),
    photos: Array.isArray(photos) ? photos.filter(Boolean) : [],
    verifiedPurchase,
    orderId: matchingOrder?.id || '',
    isModerated: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  dbStore.reviews.unshift(newReview);
  syncProductRatingSummary(product.id);

  return sendSuccess(
    res,
    verifiedPurchase
      ? 'Verified Purchase review published.'
      : 'Product review published.',
    { review: newReview },
    201
  );
};

export const deleteReview = (req: AuthRequest, res: Response) => {
  const review = dbStore.reviews.find((r) => r.id === req.params.id);
  if (!review) {
    return sendError(res, 'Review not found.', [], 404);
  }

  if (review.userId !== req.user!.id && req.user!.role !== 'admin') {
    return sendError(res, 'Forbidden: Cannot delete another user’s review.', [], 403);
  }

  dbStore.reviews = dbStore.reviews.filter((r) => r.id !== req.params.id);
  syncProductRatingSummary(review.productId);

  return sendSuccess(res, 'Review deleted.');
};

export const askQuestion = (req: AuthRequest, res: Response) => {
  const { productId, question } = req.body;
  const product = dbStore.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found.', [], 404);
  }

  const cleanQuestion = String(question || '').trim();
  if (cleanQuestion.length < 5) {
    return sendError(res, 'Question must be at least 5 characters long.', [], 400);
  }

  const newQuestion: QuestionDoc = {
    id: `qst_${Date.now()}`,
    productId: product.id,
    userId: req.user!.id,
    userName: req.user!.name,
    question: cleanQuestion,
    answer: '',
    answeredBy: '',
    answeredAt: null,
    createdAt: new Date().toISOString(),
  };

  dbStore.questions.unshift(newQuestion);

  dbStore.notifications.unshift({
    id: `notif_q_${Date.now()}`,
    userId: 'admin',
    type: 'Operational',
    title: `New Customer Question on ${product.name}`,
    message: `${req.user!.name} asked: "${cleanQuestion}"`,
    isRead: false,
    link: '/admin/questions',
    createdAt: new Date().toISOString(),
  });

  return sendSuccess(res, 'Your question has been submitted to our specialists.', {
    question: newQuestion,
  }, 201);
};

export const getNotifications = (req: AuthRequest, res: Response) => {
  const targetUserId = req.user!.role === 'admin' ? 'admin' : req.user!.id;
  const items = dbStore.notifications
    .filter((n) => n.userId === targetUserId || n.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return sendSuccess(res, 'Notifications retrieved.', {
    notifications: items,
    unreadCount: items.filter((n) => !n.isRead).length,
  });
};

export const markNotificationRead = (req: AuthRequest, res: Response) => {
  const notif = dbStore.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
  }
  return sendSuccess(res, 'Notification marked as read.');
};
