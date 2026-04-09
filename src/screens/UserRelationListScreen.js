import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RelationUserList from '../components/RelationUserList';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';

const buildScreenTitle = ({ relationType, isOwnList, routeTitle, profileName, t }) => {
  if (routeTitle) {
    return routeTitle;
  }

  if (relationType === 'following') {
    return isOwnList ? t('follow.title') : `${profileName || '该用户'}的关注`;
  }

  return isOwnList ? t('fans.title') : `${profileName || '该用户'}的粉丝`;
};

export default function UserRelationListScreen({
  navigation,
  route,
  relationType = 'followers',
}) {
  const { t } = useTranslation();
  const routeParams = route?.params ?? {};
  const isOwnList = routeParams.isOwnList !== false;
  const targetUserId = String(routeParams.userId ?? '').trim();
  const profileName =
    typeof routeParams.profileName === 'string'
      ? routeParams.profileName.trim()
      : typeof routeParams.username === 'string'
        ? routeParams.username.trim()
        : '';
  const title = buildScreenTitle({
    relationType,
    isOwnList,
    routeTitle: routeParams.title,
    profileName,
    t,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>

      <RelationUserList
        navigation={navigation}
        relationType={relationType}
        isOwnList={isOwnList}
        targetUserId={targetUserId}
        profileName={profileName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRight: {
    width: 32,
  },
});
