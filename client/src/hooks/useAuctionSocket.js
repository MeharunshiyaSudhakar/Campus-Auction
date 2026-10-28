import { useEffect, useState } from 'react';
import getSocket from '../services/socket';

/**
 * Custom hook to subscribe to live auction updates and anti-sniping extension events
 * @param {string} listingId - ID of the auction to subscribe to
 * @param {object} callbacks - { onNewBid, onAuctionExtended, onPriceUpdated }
 */
export function useAuctionSocket(listingId, callbacks = {}) {
  const [connected, setConnected] = useState(false);
  const {
    onNewBid,
    onAuctionExtended,
    onPriceUpdated,
    onAuctionClosed,
    onAuctionApproved,
    onAuctionRejected,
  } = callbacks;

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    setConnected(socket.connected);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (listingId) {
      socket.emit('join_auction', listingId);
    }

    const handleNewBid = (data) => {
      if (!listingId || data.listingId === listingId) {
        if (onNewBid) onNewBid(data);
      }
    };

    const handleAuctionExtended = (data) => {
      if (!listingId || data.listingId === listingId) {
        if (onAuctionExtended) onAuctionExtended(data);
      }
    };

    const handlePriceUpdated = (data) => {
      if (onPriceUpdated) onPriceUpdated(data);
    };

    const handleAuctionClosed = (data) => {
      if (!listingId || data.listingId === listingId) {
        if (onAuctionClosed) onAuctionClosed(data);
      }
    };

    const handleAuctionApproved = (data) => {
      if (!listingId || data.listingId === listingId) {
        if (onAuctionApproved) onAuctionApproved(data);
      }
    };

    const handleAuctionRejected = (data) => {
      if (!listingId || data.listingId === listingId) {
        if (onAuctionRejected) onAuctionRejected(data);
      }
    };

    socket.on('new_bid', handleNewBid);
    socket.on('auction_extended', handleAuctionExtended);
    socket.on('listing_price_updated', handlePriceUpdated);
    socket.on('auction_closed', handleAuctionClosed);
    socket.on('auction_approved', handleAuctionApproved);
    socket.on('auction_rejected', handleAuctionRejected);

    return () => {
      if (listingId) {
        socket.emit('leave_auction', listingId);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_bid', handleNewBid);
      socket.off('auction_extended', handleAuctionExtended);
      socket.off('listing_price_updated', handlePriceUpdated);
      socket.off('auction_closed', handleAuctionClosed);
      socket.off('auction_approved', handleAuctionApproved);
      socket.off('auction_rejected', handleAuctionRejected);
    };
  }, [
    listingId,
    onNewBid,
    onAuctionExtended,
    onPriceUpdated,
    onAuctionClosed,
    onAuctionApproved,
    onAuctionRejected,
  ]);

  return { connected };
}

export default useAuctionSocket;
