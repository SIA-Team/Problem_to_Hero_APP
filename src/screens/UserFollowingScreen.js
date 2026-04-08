import React from 'react';
import UserRelationListScreen from './UserRelationListScreen';

export default function UserFollowingScreen(props) {
  return <UserRelationListScreen {...props} relationType="following" />;
}
