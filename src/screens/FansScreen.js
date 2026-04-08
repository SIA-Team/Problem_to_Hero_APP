import React from 'react';
import UserRelationListScreen from './UserRelationListScreen';

export default function FansScreen(props) {
  return <UserRelationListScreen {...props} relationType="followers" />;
}
