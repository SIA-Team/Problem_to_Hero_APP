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
  const shareType = shareData.shareType || shareData.type || 'question';
  const qid = pickFirstNumberLike(shareData.qid, shareData.questionId, shareData.question_id);
  const aid = pickFirstNumberLike(shareData.aid, shareData.answerId, shareData.answer_id);
  const sid = pickFirstNumberLike(shareData.sid, shareData.supplementId, shareData.supplement_id);
  const cid = pickFirstNumberLike(shareData.cid, shareData.commentId, shareData.comment_id);
  const rootCid = pickFirstNumberLike(
    shareData.rootCid,
    shareData.threadRootId,
    shareData.thread_root_id,
    shareData.rootCommentId
  );

  switch (shareType) {
    case 'sharequestion':
    case 'question':
      return {
        type: 'sharequestion',
        qid: qid || pickFirstNumberLike(shareData.id),
      };
    case 'shareanswer':
    case 'answer':
      return {
        type: 'shareanswer',
        qid,
        aid: aid || pickFirstNumberLike(shareData.id),
      };
    case 'sharesupplement':
    case 'supplement':
      return {
        type: 'sharesupplement',
        qid,
        sid: sid || pickFirstNumberLike(shareData.id),
      };
    case 'sharecomment':
    case 'comment':
      return {
        type: 'sharecomment',
        qid,
        aid,
        sid,
        cid: cid || pickFirstNumberLike(shareData.id),
        rootCid: rootCid || cid || pickFirstNumberLike(shareData.id),
      };
    default:
      return {
        type: 'sharequestion',
        qid: qid || pickFirstNumberLike(shareData.id),
      };
  }
};

export const buildShareUrl = (shareData = {}) => {
  if (shareData?.url) {
    return shareData.url;
  }

  const normalized = buildShareParams(shareData);
  const params = new URLSearchParams();

  appendIfPresent(params, 'type', normalized.type);
  appendIfPresent(params, 'qid', normalized.qid);
  appendIfPresent(params, 'aid', normalized.aid);
  appendIfPresent(params, 'sid', normalized.sid);
  appendIfPresent(params, 'cid', normalized.cid);
  appendIfPresent(params, 'rootCid', normalized.rootCid);
  appendIfPresent(params, 'traceId', shareData.traceId);

  const query = params.toString();
  return query ? `${SHARE_BASE_URL}?${query}` : SHARE_BASE_URL;
};

export const buildTwitterShareText = (shareData = {}) => {
  if (typeof shareData.shareText === 'string' && shareData.shareText.trim()) {
    return shareData.shareText.trim();
  }

  const title = typeof shareData.title === 'string' ? shareData.title.trim() : '';
  const content = typeof shareData.content === 'string' ? shareData.content.trim() : '';
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
