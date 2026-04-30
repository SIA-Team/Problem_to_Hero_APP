export const createInitialActivityForm = ({ teamId = null, teamName = '' } = {}) => ({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  maxParticipants: '',
  contact: '',
  activityType: 'online',
  organizerType: teamId ? 'team' : 'personal',
  teamId: teamId || null,
  teamName: teamName || '',
  images: [],
});

export const toPositiveInt = value => {
  const normalizedValue = Number(value);
  return Number.isInteger(normalizedValue) && normalizedValue > 0 ? normalizedValue : undefined;
};

const ACTIVITY_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export const parseActivityDateTime = value => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(ACTIVITY_DATE_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0
  );
};

export const formatActivityApiDateTime = (value, boundary = 'start') => {
  const normalizedValue = String(value ?? '').trim();
  const parsedDate = parseActivityDateTime(normalizedValue);

  if (!parsedDate) {
    return normalizedValue;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hasExplicitTime = /[ T]\d{2}:\d{2}/.test(normalizedValue);
  const hours = String(parsedDate.getHours()).padStart(2, '0');
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const time = hasExplicitTime
    ? `${hours}:${minutes}:00`
    : boundary === 'end'
      ? '23:59:59'
      : '00:00:00';

  return `${year}-${month}-${day}T${time}`;
};

export const normalizeActivityTeam = team => ({
  id: Number(team?.id) || 0,
  name: String(team?.name ?? '').trim(),
  avatar: String(team?.avatar ?? '').trim(),
  members: Number(team?.memberCount) || 0,
});

export const buildActivityFormCopy = (t, variant = 'page') => {
  const isPage = variant === 'page';
  const imageLabelKey = isPage
    ? 'screens.createActivity.images.label'
    : 'screens.questionActivityList.modal.images.label';
  const imageLimitKey = isPage
    ? 'screens.createActivity.images.maxLimit'
    : 'screens.questionActivityList.modal.images.maxLimit';

  return {
    organizerLabel: t(isPage ? 'screens.createActivity.organizerType.label' : 'screens.questionActivityList.modal.organizerType.label'),
    organizerRequired: t(isPage ? 'screens.createActivity.organizerType.required' : 'screens.questionActivityList.modal.organizerType.required'),
    organizerPersonal: t(isPage ? 'screens.createActivity.organizerType.personal' : 'screens.questionActivityList.modal.organizerType.personal'),
    organizerTeam: t(isPage ? 'screens.createActivity.organizerType.team' : 'screens.questionActivityList.modal.organizerType.team'),
    organizerTeamBadge: t('screens.createActivity.organizerType.teamBadge'),
    selectedTeamChange: t('screens.createActivity.selectedTeam.change'),
    activityTypeLabel: t(isPage ? 'screens.createActivity.activityType.label' : 'screens.questionActivityList.modal.activityType.label'),
    activityTypeOnline: t(isPage ? 'screens.createActivity.activityType.online' : 'screens.questionActivityList.modal.activityType.online'),
    activityTypeOffline: t(isPage ? 'screens.createActivity.activityType.offline' : 'screens.questionActivityList.modal.activityType.offline'),
    titleLabel: t(isPage ? 'screens.createActivity.activityTitle.label' : 'screens.questionActivityList.modal.title.label'),
    titleRequired: t(isPage ? 'screens.createActivity.activityTitle.required' : 'screens.questionActivityList.modal.title.required'),
    titlePlaceholder: t(isPage ? 'screens.createActivity.activityTitle.placeholder' : 'screens.questionActivityList.modal.title.placeholder'),
    descriptionLabel: t(isPage ? 'screens.createActivity.description.label' : 'screens.questionActivityList.modal.description.label'),
    descriptionRequired: t(isPage ? 'screens.createActivity.description.required' : 'screens.questionActivityList.modal.description.required'),
    descriptionPlaceholder: t(isPage ? 'screens.createActivity.description.placeholder' : 'screens.questionActivityList.modal.description.placeholder'),
    timeLabel: t(isPage ? 'screens.createActivity.time.label' : 'screens.questionActivityList.modal.time.label'),
    timeRequired: t(isPage ? 'screens.createActivity.time.required' : 'screens.questionActivityList.modal.time.required'),
    timeStartDate: t(isPage ? 'screens.createActivity.time.startDate' : 'screens.questionActivityList.modal.time.startDate'),
    timeEndDate: t(isPage ? 'screens.createActivity.time.endDate' : 'screens.questionActivityList.modal.time.endDate'),
    timeStartPlaceholder: t(isPage ? 'screens.createActivity.time.startPlaceholder' : 'screens.questionActivityList.modal.time.startPlaceholder'),
    timeEndPlaceholder: t(isPage ? 'screens.createActivity.time.endPlaceholder' : 'screens.questionActivityList.modal.time.endPlaceholder'),
    timeTo: t(isPage ? 'screens.createActivity.time.to' : 'screens.questionActivityList.modal.time.to'),
    timePickerStartTitle: t('screens.createActivity.time.picker.startTitle'),
    timePickerEndTitle: t('screens.createActivity.time.picker.endTitle'),
    timePickerCancel: t('screens.createActivity.time.picker.cancel'),
    timePickerConfirm: t('screens.createActivity.time.picker.confirm'),
    timeUnsetLabel: t('channelManage.notSelected'),
    locationLabel: t(isPage ? 'screens.createActivity.location.label' : 'screens.questionActivityList.modal.location.label'),
    locationRequired: t(isPage ? 'screens.createActivity.location.required' : 'screens.questionActivityList.modal.location.required'),
    locationPlaceholder: t(isPage ? 'screens.createActivity.location.placeholder' : 'screens.questionActivityList.modal.location.placeholder'),
    imagesLabel: `${t(imageLabelKey)} (${t(imageLimitKey)})`,
    imagesAdd: t(isPage ? 'screens.createActivity.images.add' : 'screens.questionActivityList.modal.images.add'),
    contactLabel: t(isPage ? 'screens.createActivity.contact.label' : 'screens.questionActivityList.modal.contact.label'),
    contactPlaceholder: t(isPage ? 'screens.createActivity.contact.placeholder' : 'screens.questionActivityList.modal.contact.placeholder'),
    teamSelectorTitle: t('screens.createActivity.teamSelector.title'),
    teamSelectorMembers: t('screens.createActivity.teamSelector.members'),
    boundQuestionLabel: '',
    validationHint: t('screens.createActivity.validation.hint'),
    validationTitleRequired: t(isPage ? 'screens.createActivity.validation.titleRequired' : 'screens.questionActivityList.modal.validation.titleRequired'),
    validationDescriptionRequired: t(isPage ? 'screens.createActivity.validation.descriptionRequired' : 'screens.questionActivityList.modal.validation.descriptionRequired'),
    validationTimeRequired: t(isPage ? 'screens.createActivity.validation.timeRequired' : 'screens.questionActivityList.modal.validation.timeRequired'),
    validationEndTimeInvalid: t('screens.createActivity.validation.endTimeInvalid'),
    validationLocationRequired: t(isPage ? 'screens.createActivity.validation.locationRequired' : 'screens.questionActivityList.modal.validation.locationRequired'),
    validationQuestionRequired: t('screens.createActivity.validation.questionRequired'),
    validationTeamRequired: t('screens.createActivity.validation.teamRequired'),
    validationImagesMaxLimit: t(imageLimitKey),
    serverErrorMessage: t('publish.toasts.serverError'),
    requestFailedMessage: t('publish.toasts.publishFailed'),
    successTitle: t('screens.createActivity.success.title'),
    successMessage: isPage ? t('screens.createActivity.success.message') : t('screens.questionActivityList.modal.createSuccess'),
    successConfirm: t('screens.createActivity.success.confirm'),
  };
};
