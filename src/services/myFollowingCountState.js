import { fetchMyFollowingTotalCount } from '../utils/followingList';

let myFollowingCount = 0;
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener(myFollowingCount);
    } catch (error) {
      console.error('myFollowingCount listener failed:', error);
    }
  });
};

export const getMyFollowingCount = () => myFollowingCount;

export const setMyFollowingCount = count => {
  const normalizedCount = Number(count);
  myFollowingCount = Number.isFinite(normalizedCount) && normalizedCount >= 0 ? normalizedCount : 0;
  notifyListeners();
  return myFollowingCount;
};

export const subscribeMyFollowingCount = listener => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const refreshMyFollowingCount = async () => {
  const totalCount = await fetchMyFollowingTotalCount();
  return setMyFollowingCount(totalCount);
};
