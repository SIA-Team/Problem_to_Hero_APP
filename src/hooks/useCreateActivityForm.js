import { useCallback, useEffect, useMemo, useState } from 'react';
import activityApi from '../services/api/activityApi';
import teamApi from '../services/api/teamApi';
import { isVisibleMyTeam, normalizeMyTeam } from '../utils/teamTransforms';
import {
  createInitialActivityForm,
  formatActivityApiDateTime,
  normalizeActivityTeam,
  parseActivityDateTime,
  toPositiveInt,
} from '../utils/createActivityShared';

const normalizeMyTeamForActivitySelection = team => ({
  id: Number(team?.id) || 0,
  name: String(team?.name ?? '').trim(),
  avatar: String(team?.avatar ?? '').trim(),
  members: Number(team?.memberCount ?? team?.members) || 0,
});

export default function useCreateActivityForm({
  copy,
  questionId,
  requireQuestionId = false,
  lockedTeamId = null,
  lockedTeamName = '',
  visible = true,
}) {
  const [form, setForm] = useState(() =>
    createInitialActivityForm({
      teamId: lockedTeamId,
      teamName: lockedTeamName,
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState([]);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState(null);

  const isLockedTeam = useMemo(
    () => Boolean(lockedTeamId && lockedTeamName),
    [lockedTeamId, lockedTeamName]
  );

  const resetForm = useCallback(() => {
    setForm(
      createInitialActivityForm({
        teamId: lockedTeamId,
        teamName: lockedTeamName,
      })
    );
    setShowTeamSelector(false);
    setActiveTimeField(null);
  }, [lockedTeamId, lockedTeamName]);

  const updateField = useCallback((field, value) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const updateFields = useCallback(nextValues => {
    setForm(current => ({
      ...current,
      ...nextValues,
    }));
  }, []);

  const addImage = useCallback(
    (imageUri = `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`) => {
      if (form.images.length >= 9) {
        throw new Error(copy.validationImagesMaxLimit);
      }

      setForm(current => ({
        ...current,
        images: [...current.images, imageUri],
      }));
    },
    [copy.validationImagesMaxLimit, form.images.length]
  );

  const removeImage = useCallback(index => {
    setForm(current => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }, []);

  const loadTeams = useCallback(async () => {
    if (isLockedTeam) {
      return;
    }

    try {
      const response = await activityApi.getMyActivityTeams();
      const isSuccess = response?.code === 0 || response?.code === 200;

      if (!isSuccess) {
        throw new Error(response?.msg || copy.serverErrorMessage);
      }

      const teamList = Array.isArray(response?.data) ? response.data : [];
      const normalizedTeams = teamList
        .map(normalizeActivityTeam)
        .filter(team => team.id > 0 && team.name);

      if (normalizedTeams.length > 0) {
        setTeams(normalizedTeams);
        return;
      }

      const fallbackResponse = await teamApi.getMyTeams();
      const fallbackSuccess = fallbackResponse?.code === 0 || fallbackResponse?.code === 200;

      if (!fallbackSuccess) {
        throw new Error(fallbackResponse?.msg || copy.serverErrorMessage);
      }

      const fallbackTeamList = Array.isArray(fallbackResponse?.data) ? fallbackResponse.data : [];
      const normalizedFallbackTeams = fallbackTeamList
        .map(normalizeMyTeam)
        .filter(isVisibleMyTeam)
        .map(normalizeMyTeamForActivitySelection)
        .filter(team => team.id > 0 && team.name);

      setTeams(normalizedFallbackTeams);
    } catch (error) {
      console.error('Failed to load activity teams:', error);
      setTeams([]);
    }
  }, [copy.serverErrorMessage, isLockedTeam]);

  const openTeamSelector = useCallback(() => {
    if (isLockedTeam) {
      return;
    }

    setShowTeamSelector(true);
    void loadTeams();
  }, [isLockedTeam, loadTeams]);

  const closeTeamSelector = useCallback(() => {
    setShowTeamSelector(false);
  }, []);

  const handleSelectTeam = useCallback(team => {
    setForm(current => ({
      ...current,
      organizerType: 'team',
      teamId: team.id,
      teamName: team.name,
    }));
    setShowTeamSelector(false);
  }, []);

  const handleOrganizerTypeChange = useCallback(
    type => {
      if (isLockedTeam) {
        return;
      }

      if (type === 'team') {
        setForm(current => ({
          ...current,
          organizerType: 'team',
        }));
        setShowTeamSelector(true);
        void loadTeams();
        return;
      }

      setForm(current => ({
        ...current,
        organizerType: 'personal',
        teamId: null,
        teamName: '',
      }));
    },
    [isLockedTeam, loadTeams]
  );

  const handleSelectDateTime = useCallback((field, value) => {
    if (!field) {
      return;
    }

    updateField(field, value);
  }, [updateField]);

  useEffect(() => {
    if (!visible || isLockedTeam) {
      return undefined;
    }

    void loadTeams();
    return undefined;
  }, [loadTeams, visible]);

  const submitActivity = useCallback(async () => {
    if (submitting) {
      return null;
    }

    if (!form.title.trim()) {
      throw new Error(copy.validationTitleRequired);
    }

    if (!form.description.trim()) {
      throw new Error(copy.validationDescriptionRequired);
    }

    if (!form.startTime || !form.endTime) {
      throw new Error(copy.validationTimeRequired);
    }

    const startDate = parseActivityDateTime(form.startTime);
    const endDate = parseActivityDateTime(form.endTime);

    if (startDate && endDate && endDate < startDate) {
      throw new Error(copy.validationEndTimeInvalid);
    }

    if (form.activityType === 'offline' && !form.location.trim()) {
      throw new Error(copy.validationLocationRequired);
    }

    if (form.organizerType === 'team' && !form.teamName) {
      throw new Error(copy.validationTeamRequired);
    }

    if (requireQuestionId && !toPositiveInt(questionId)) {
      throw new Error(copy.validationQuestionRequired);
    }

    setSubmitting(true);

    try {
      const requestPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        coverImage: form.images[0] || '',
        images: form.images,
        activeStartTime: formatActivityApiDateTime(form.startTime, 'start'),
        activeEndTime: formatActivityApiDateTime(form.endTime, 'end'),
        location: form.activityType === 'offline' ? form.location.trim() : '',
        activeType: form.activityType === 'offline' ? 2 : 1,
        sponsorType: form.organizerType === 'team' ? 2 : 1,
        teamId: form.organizerType === 'team' ? toPositiveInt(form.teamId) : undefined,
        questionId: toPositiveInt(questionId),
        activeData: form.contact.trim()
          ? JSON.stringify({
              contact: form.contact.trim(),
            })
          : '',
      };

      const response = await activityApi.createActivity(requestPayload);
      const isSuccess = response?.code === 0 || response?.code === 200;

      if (!isSuccess || !response?.data) {
        throw new Error(response?.msg || copy.requestFailedMessage);
      }

      return response.data;
    } finally {
      setSubmitting(false);
    }
  }, [
    copy.requestFailedMessage,
    copy.validationDescriptionRequired,
    copy.validationEndTimeInvalid,
    copy.validationLocationRequired,
    copy.validationQuestionRequired,
    copy.validationTeamRequired,
    copy.validationTimeRequired,
    copy.validationTitleRequired,
    form,
    questionId,
    requireQuestionId,
    submitting,
  ]);

  return {
    activeTimeField,
    addImage,
    closeTeamSelector,
    form,
    handleOrganizerTypeChange,
    handleSelectDateTime,
    handleSelectTeam,
    openTeamSelector,
    removeImage,
    resetForm,
    setActiveTimeField,
    setShowTeamSelector,
    showTeamSelector,
    submitActivity,
    submitting,
    teams,
    loadTeams,
    updateField,
    updateFields,
  };
}
