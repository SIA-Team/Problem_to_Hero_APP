import { Linking } from 'react-native';

export const APP_SHARE_SCHEME = 'problemtohero://';
const TWITTER_APP_SCHEME = 'twitter://';

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

const buildQueryString = (entries = {}) => {
  const params = new URLSearchParams();

  Object.entries(entries).forEach(([key, value]) => {
    appendIfPresent(params, key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
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
  const sharedQuery = {
    traceId: safeShareData.traceId,
    shareType: normalized.type,
  };

  switch (normalized.type) {
    case 'shareanswer':
      return `${APP_SHARE_SCHEME}answer/${normalized.aid || ''}${buildQueryString({
        ...sharedQuery,
        questionId: normalized.qid,
      })}`;
    case 'sharesupplement':
      return `${APP_SHARE_SCHEME}supplement/${normalized.sid || ''}${buildQueryString({
        ...sharedQuery,
        parentQuestionId: normalized.qid,
      })}`;
    case 'sharecomment':
      if (normalized.aid) {
        return `${APP_SHARE_SCHEME}answer/${normalized.aid}${buildQueryString({
          ...sharedQuery,
          questionId: normalized.qid,
          commentId: normalized.cid,
          rootCommentId: normalized.rootCid,
        })}`;
      }

      if (normalized.sid) {
        return `${APP_SHARE_SCHEME}supplement/${normalized.sid}${buildQueryString({
          ...sharedQuery,
          parentQuestionId: normalized.qid,
          commentId: normalized.cid,
          rootCommentId: normalized.rootCid,
        })}`;
      }

      return `${APP_SHARE_SCHEME}question/${normalized.qid || ''}${buildQueryString({
        ...sharedQuery,
        commentId: normalized.cid,
        rootCommentId: normalized.rootCid,
      })}`;
    case 'sharequestion':
    default:
      return `${APP_SHARE_SCHEME}question/${normalized.qid || ''}${buildQueryString(sharedQuery)}`;
  }
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
    return `Check this out on Problem to Hero: ${shortened}`;
  }

  return 'Check this out on Problem to Hero';
};

const normalizeTwitterHandle = (value, fallback = '@ProblemToHero') => {
  const normalized = String(value ?? '').trim();
  const source = normalized || fallback;

  return source.startsWith('@') ? source : `@${source}`;
};

export const buildProblemToHeroInviteText = ({
  twitterHandle,
  inviterUsername,
  title,
} = {}) => {
  const normalizedTwitterHandle = String(twitterHandle ?? '').trim();
  const normalizedInviterHandle = normalizeTwitterHandle(inviterUsername, '@ProblemToHero');
  const normalizedTitle = String(title ?? '').trim();

  if (normalizedTwitterHandle && normalizedTitle) {
    return `${normalizeTwitterHandle(normalizedTwitterHandle)} ${normalizedInviterHandle} on Problem to Hero invited you to answer: ${normalizedTitle}`;
  }

  if (normalizedTwitterHandle) {
    return `${normalizeTwitterHandle(normalizedTwitterHandle)} ${normalizedInviterHandle} on Problem to Hero invited you to answer this question.`;
  }

  if (normalizedTitle) {
    return `${normalizedInviterHandle} on Problem to Hero invited you to answer: ${normalizedTitle}`;
  }

  return `${normalizedInviterHandle} on Problem to Hero invited you to answer this question.`;
};

export const buildTwitterIntentUrl = (shareData = {}) => {
  const shareUrl = buildShareUrl(shareData);
  const shareText = `${buildTwitterShareText(shareData)}\n${shareUrl}`;
  const params = new URLSearchParams({ text: shareText });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

export const buildTwitterNativeShareUrl = (shareData = {}) => {
  const shareUrl = buildShareUrl(shareData);
  const shareText = `${buildTwitterShareText(shareData)}\n${shareUrl}`;

  return `${TWITTER_APP_SCHEME}post?message=${encodeURIComponent(shareText)}`;
};

export const openTwitterShare = async (shareData = {}) => {
  const twitterNativeShareUrl = buildTwitterNativeShareUrl(shareData);
  const twitterIntentUrl = buildTwitterIntentUrl(shareData);
  const shareUrl = buildShareUrl(shareData);

  try {
    const canOpenTwitterApp = await Linking.canOpenURL(TWITTER_APP_SCHEME);

    if (canOpenTwitterApp) {
      await Linking.openURL(twitterNativeShareUrl);
      return {
        twitterNativeShareUrl,
        twitterIntentUrl,
        shareUrl,
        openedVia: 'app',
      };
    }
  } catch (error) {
    console.warn('Unable to verify Twitter app availability, falling back to web share.', error);
  }

  await Linking.openURL(twitterIntentUrl);

  return {
    twitterNativeShareUrl,
    twitterIntentUrl,
    shareUrl,
    openedVia: 'browser',
  };
};
