const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Bid = require('../models/Bid');

class ProfileService {
  /**
   * Helper to compute date range filter from query params
   */
  static parseDateRange(period, from, to) {
    const now = new Date();
    let startDate = null;
    let endDate = now;

    if (period === 'day') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else if (period === 'custom' && from) {
      startDate = new Date(from);
      if (to) {
        endDate = new Date(to);
      }
    }

    if (startDate) {
      return { $gte: startDate, $lte: endDate };
    }
    return null;
  }

  /**
   * Selling History: Items listed by the student with outcomes and final prices
   */
  static async getSellingHistory(userId, query = {}) {
    const { period, from, to, page = 1, limit = 20 } = query;
    const filter = { seller: new mongoose.Types.ObjectId(userId) };

    const dateFilter = this.parseDateRange(period, from, to);
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [items, totalCount] = await Promise.all([
      Listing.find(filter)
        .populate('winner', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
    ]);

    // Map into clean structured history items with friendly outcomes
    const mappedItems = items.map((item) => {
      let outcome = item.status;
      if (item.status === 'completed') outcome = 'sold';
      else if (['pending_approval', 'approved', 'pickup_scheduled'].includes(item.status)) outcome = 'pending';
      else if (item.status === 'active') outcome = 'active';

      return {
        _id: item._id,
        title: item.title,
        category: item.category,
        photos: item.photos,
        conditionGrade: item.condition?.grade,
        startingPrice: item.startingPrice,
        finalPrice: item.finalPrice || (['completed', 'approved', 'pending_approval'].includes(item.status) ? item.currentPrice : null),
        bidCount: item.bidCount,
        status: item.status,
        outcome,
        winnerName: item.winner?.name || null,
        createdAt: item.createdAt,
        closingTime: item.closingTime,
        handoverCompletedAt: item.handoverCompletedAt,
      };
    });

    return {
      items: mappedItems,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
    };
  }

  /**
   * Buying History: Auctions the student placed bids on with outcome (won / lost / pending / active)
   */
  static async getBuyingHistory(userId, query = {}) {
    const { period, from, to, page = 1, limit = 20 } = query;
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Find all distinct listings where user placed bids
    const userBids = await Bid.find({ bidder: userObjId }).select('listing amount bidTime isWinningBid');
    const listingIdMap = new Map();
    userBids.forEach((bid) => {
      const idStr = bid.listing.toString();
      if (!listingIdMap.has(idStr) || listingIdMap.get(idStr).amount < bid.amount) {
        listingIdMap.set(idStr, bid);
      }
    });

    const listingIds = Array.from(listingIdMap.keys()).map((id) => new mongoose.Types.ObjectId(id));

    const filter = { _id: { $in: listingIds } };
    const dateFilter = this.parseDateRange(period, from, to);
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [listings, totalCount] = await Promise.all([
      Listing.find(filter)
        .populate('seller', 'name')
        .populate('winner', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
    ]);

    const mappedItems = listings.map((item) => {
      const myMaxBid = listingIdMap.get(item._id.toString())?.amount || 0;
      const isWinner = item.winner && item.winner._id.toString() === userId.toString();

      let outcome = 'lost';
      if (item.status === 'active') {
        outcome = item.leadingBidder?.toString() === userId.toString() ? 'leading' : 'outbid';
      } else if (isWinner) {
        if (item.status === 'completed') outcome = 'won';
        else if (['pending_approval', 'approved', 'pickup_scheduled'].includes(item.status)) outcome = 'pending';
        else outcome = item.status; // rejected, pickup_failed
      } else {
        outcome = 'lost';
      }

      return {
        _id: item._id,
        title: item.title,
        category: item.category,
        photos: item.photos,
        conditionGrade: item.condition?.grade,
        sellerName: item.seller?.name || 'Seller',
        myMaxBid,
        finalPrice: item.finalPrice || item.currentPrice,
        status: item.status,
        outcome,
        isWinner: !!isWinner,
        createdAt: item.createdAt,
        closingTime: item.closingTime,
        handoverCompletedAt: item.handoverCompletedAt,
      };
    });

    return {
      items: mappedItems,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
    };
  }

  /**
   * Money Summary: Total spent and total received.
   * Only count completed handovers. Pending/reserved amounts are returned separately.
   */
  static async getSummary(userId, query = {}) {
    const { period, from, to } = query;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const dateFilter = this.parseDateRange(period, from, to);

    // 1. Seller Summary (Sales received and pending)
    const sellerMatch = { seller: userObjId };
    if (dateFilter) sellerMatch.createdAt = dateFilter;

    const sellerListings = await Listing.find(sellerMatch);

    let totalReceived = 0; // Completed handovers only
    let pendingReceived = 0; // Reserved / pending approval
    let totalListed = sellerListings.length;
    let soldCount = 0;
    let unsoldCount = 0;

    sellerListings.forEach((item) => {
      const price = item.finalPrice || item.currentPrice || item.startingPrice || 0;
      if (item.status === 'completed') {
        totalReceived += price;
        soldCount += 1;
      } else if (['pending_approval', 'approved', 'pickup_scheduled'].includes(item.status)) {
        pendingReceived += price;
      } else if (['unsold', 'rejected', 'pickup_failed'].includes(item.status)) {
        unsoldCount += 1;
      }
    });

    // 2. Buyer Summary (Purchases spent and pending)
    const buyerMatch = { winner: userObjId };
    if (dateFilter) buyerMatch.createdAt = dateFilter;

    const buyerListings = await Listing.find(buyerMatch);

    let totalSpent = 0; // Completed handovers only
    let pendingSpent = 0; // Reserved / pending approval
    let itemsWon = 0;

    buyerListings.forEach((item) => {
      const price = item.finalPrice || item.currentPrice || 0;
      if (item.status === 'completed') {
        totalSpent += price;
        itemsWon += 1;
      } else if (['pending_approval', 'approved', 'pickup_scheduled'].includes(item.status)) {
        pendingSpent += price;
      }
    });

    return {
      totalSpent,
      totalReceived,
      pendingSpent,
      pendingReceived,
      stats: {
        totalListed,
        soldCount,
        unsoldCount,
        itemsWon,
      },
      period: period || 'all',
    };
  }

  /**
   * Time-series Chart Aggregation: Grouped by day, month, or year for the selected range.
   */
  static async getChartData(userId, query = {}) {
    const { period = 'month', from, to } = query;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const dateFilter = this.parseDateRange(period, from, to);

    // Determine Mongo date format string
    let dateFormat = '%Y-%m-%d';
    if (period === 'year') {
      dateFormat = '%Y-%m';
    } else if (period === 'day') {
      dateFormat = '%Y-%m-%d %H:00';
    }

    // Aggregation for Seller data (Received & Sold/Unsold counts)
    const sellerMatch = { seller: userObjId };
    if (dateFilter) sellerMatch.createdAt = dateFilter;

    const sellerAgg = await Listing.aggregate([
      { $match: sellerMatch },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          received: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$finalPrice', '$currentPrice'] },
                0,
              ],
            },
          },
          soldCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          unsoldCount: {
            $sum: { $cond: [{ $in: ['$status', ['unsold', 'rejected', 'pickup_failed']] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregation for Buyer data (Spent)
    const buyerMatch = { winner: userObjId, status: 'completed' };
    if (dateFilter) buyerMatch.createdAt = dateFilter;

    const buyerAgg = await Listing.aggregate([
      { $match: buyerMatch },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          spent: {
            $sum: { $ifNull: ['$finalPrice', '$currentPrice'] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge by date key
    const dateMap = new Map();

    sellerAgg.forEach((row) => {
      dateMap.set(row._id, {
        date: row._id,
        received: row.received,
        spent: 0,
        soldCount: row.soldCount,
        unsoldCount: row.unsoldCount,
      });
    });

    buyerAgg.forEach((row) => {
      if (dateMap.has(row._id)) {
        dateMap.get(row._id).spent = row.spent;
      } else {
        dateMap.set(row._id, {
          date: row._id,
          received: 0,
          spent: row.spent,
          soldCount: 0,
          unsoldCount: 0,
        });
      }
    });

    const sortedData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return sortedData;
  }
}

module.exports = ProfileService;
