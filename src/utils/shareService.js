import { Linking } from 'react-native';

const SHARE_BASE_URL = 'https://xxxx.xxx.com/share/openapp';

const pickFirstNumberLike = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const normalized = Number(value);
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
};

const appendIfPresent = (params, key, value) => {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.append(key, String(value));
};

export const buildShareParams = (shareData = {}) => {
  const safeShareData = shareData && typeof shareData === 'object' ? shareData : {};
  const shareType = safeShareData.shareType || safeShareData.type || 'question';
  const qid = pickFirstNumberLike(safeShareData.qid, safeShareData.questionId, safeShareData.question_id);
  const aid = pickFirstNumberLike(safeShareData.aid, safeShareData.answerId, safeShareData.answer_id);
  const sid = pickFirstNumberLike(safeShareData.sid, safeShareData.supplementId, safeShareData.supplement_id);
  const cid = pickFirstNumberLike(safeShareData.cid, safeShareData.commentId, safeShareData.comment_id);
  const rootCid = pickFirstNumberLike(
    safeShareData.rootCid,
    safeShareData.threadRootId,
    safeShareData.thread_root_id,
    safeShareData.rootCommentId
  );

  switch (shareType) {
    case 'sharequestion':
    case 'question':
      return {
        type: 'sharequestion',
        qid: qid || pickFirstNumberLike(safeShareData.id),
      };
    case 'shareanswer':
    case 'answer':
      return {
        type: 'shareanswer',
        qid,
        aid: aid || pickFirstNumberLike(safeShareData.id),
      };
    case 'sharesupplement':
    case 'supplement':
      return {
        type: 'sharesupplement',
        qid,
        sid: sid || pickFirstNumberLike(safeShareData.id),
      };
    case 'sharecomment':
    case 'comment':
      return {
        type: 'sharecomment',
        qid,
        aid,
        sid,
        cid: cid || pickFirstNumberLike(safeShareData.id),
        rootCid: rootCid || cid || pickFirstNumberLike(safeShareData.id),
      };
    default:
      return {
        type: 'sharequestion',
        qid: qid || pickFirstNumberLike(safeShareData.id),
      };
  }
};

export const buildShareUrl = (shareData = {}) => {
  const safeShareData = shareData && typeof shareData === 'object' ? shareData : {};

  if (safeShareData.url) {
    return safeShareData.url;
  }

  const normalized = buildShareParams(safeShareData);
  const params = new URLSearchParams();

  appendIfPresent(params, 'type', normalized.type);
  appendIfPresent(params, 'qid', normalized.qid);
  appendIfPresent(params, 'aid', normalized.aid);
  appendIfPresent(params, 'sid', normalized.sid);
  appendIfPresent(params, 'cid', normalized.cid);
  appendIfPresent(params, 'rootCid', normalized.rootCid);
  appendIfPresent(params, 'traceId', safeShareData.traceId);

  const query = params.toString();
  return query ? `${SHARE_BASE_URL}?${query}` : SHARE_BASE_URL;
};

export const buildTwitterShareText = (shareData = {}) => {
  const safeShareData = shareData && typeof shareData === 'object' ? shareData : {};

  if (typeof safeShareData.shareText === 'string' && safeShareData.shareText.trim()) {
    return safeShareData.shareText.trim();
  }

  const title = typeof safeShareData.title === 'string' ? safeShareData.title.trim() : '';
  const content = typeof safeShareData.content === 'string' ? safeShareData.content.trim() : '';
  const leadText = title || content;

  if (leadText) {
    const shortened = leadText.length > 80 ? `${leadText.slice(0, 77)}...` : leadText;
    return `Check this out on Kaiwen: ${shortened}`;
  }

  return 'Check this out on Kaiwen';
};

export const buildTwitterIntentUrl = (shareData = {}) => {
  const shareUrl = buildShareUrl(shareData);
  const shareText = buildTwitterShareText(shareData);
  const params = new URLSearchParams({
    text: shareText,
    url: shareUrl,
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

export const openTwitterShare = async (shareData = {}) => {
  const twitterIntentUrl = buildTwitterIntentUrl(shareData);
  await Linking.openURL(twitterIntentUrl);

  return {
    twitterIntentUrl,
    shareUrl: buildShareUrl(shareData),
  };
};
