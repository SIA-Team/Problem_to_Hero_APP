import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const teamApi = {
  getMyTeams: () => apiClient.get(API_ENDPOINTS.TEAM.MINE),

  getTeamDetail: (teamId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.DETAIL, {
      teamId: String(teamId ?? '').trim(),
    });

    return apiClient.get(url);
  },

  applyToTeam: (teamId, reason = '') => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.APPLY, {
      teamId: String(teamId ?? '').trim(),
    });

    return apiClient.post(url, {
      reason: String(reason ?? '').trim(),
    });
  },

  getTeamApplications: (teamId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.APPLICATIONS, {
      teamId: String(teamId ?? '').trim(),
    });

    return apiClient.get(url);
  },

  approveTeamApplication: (teamId, appUserId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.APPROVE_APPLICATION, {
      teamId: String(teamId ?? '').trim(),
      appUserId: String(appUserId ?? '').trim(),
    });

    return apiClient.post(url);
  },

  rejectTeamApplication: (teamId, appUserId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.REJECT_APPLICATION, {
      teamId: String(teamId ?? '').trim(),
      appUserId: String(appUserId ?? '').trim(),
    });

    return apiClient.post(url);
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
