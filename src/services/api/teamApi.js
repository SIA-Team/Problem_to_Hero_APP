import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const teamApi = {
  getTeamDetail: (teamId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.DETAIL, {
      teamId: String(teamId ?? '').trim(),
    });

    return apiClient.get(url);
  },

  transferCaptain: (teamId, newCaptainUserId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.TRANSFER, {
      teamId: String(teamId ?? '').trim(),
    });

    return apiClient.post(url, {
      newCaptainUserId: Number(newCaptainUserId) || 0,
    });
  },

  leaveTeam: (teamId, newCaptainUserId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.LEAVE, {
      teamId: String(teamId ?? '').trim(),
    });
    const payload = {};

    if (newCaptainUserId !== undefined && newCaptainUserId !== null && newCaptainUserId !== '') {
      payload.newCaptainUserId = Number(newCaptainUserId) || 0;
    }

    return apiClient.post(url, payload);
  },

  createTeam: (payload) => {
    const normalizedQuestionIds = Array.isArray(payload?.questionIds)
      ? payload.questionIds.filter((id) => id !== undefined && id !== null && id !== '')
      : [];

    return apiClient.post(API_ENDPOINTS.TEAM.CREATE, {
      questionIds: normalizedQuestionIds,
      name: String(payload?.name ?? '').trim(),
      description: String(payload?.description ?? '').trim(),
      avatar: String(payload?.avatar ?? '').trim(),
      maxMembers: Number(payload?.maxMembers) || 0,
    });
  },
};

export default teamApi;
