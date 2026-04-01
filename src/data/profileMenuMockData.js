export const DEFAULT_MY_GROUPS = [
  {
    id: 1,
    name: 'Python学习交流群',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group1',
    memberCount: 128,
    lastMessage: '大家好，有人在吗？',
    lastMessageTime: '10:30',
    unreadCount: 3,
  },
  {
    id: 2,
    name: '前端开发讨论组',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group2',
    memberCount: 256,
    lastMessage: 'React 18 有什么新特性？',
    lastMessageTime: '昨天',
    unreadCount: 0,
  },
  {
    id: 3,
    name: '算法刷题小组',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group3',
    memberCount: 89,
    lastMessage: '今天的每日一题做了吗？',
    lastMessageTime: '2天前',
    unreadCount: 15,
  },
];

export const DEFAULT_MY_TEAMS = [
  {
    id: 1,
    name: 'Python学习互助团队',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=team1',
    role: '队长',
    members: 12,
    questions: 45,
    description: '专注Python学习，互帮互助，共同进步',
    createdAt: '2025-12-15',
    isActive: true,
    creatorId: 1,
    currentUserId: 1,
    isAdmin: true,
  },
  {
    id: 2,
    name: '数据分析实战团队',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=team2',
    role: '成员',
    members: 8,
    questions: 23,
    description: '数据分析实战项目，分享经验与技巧',
    createdAt: '2026-01-05',
    isActive: true,
    creatorId: 2,
    currentUserId: 3,
    isAdmin: false,
  },
];

export const DEFAULT_MY_ACTIVITIES = [
  {
    id: 1,
    title: 'Python 7天打卡挑战',
    organizer: '编程成长营',
    cover: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    status: '进行中',
    participants: 128,
    reward: '$88',
    joinedAt: '今天加入',
  },
  {
    id: 2,
    title: '前端项目实战训练',
    organizer: '前端研究社',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    status: '进行中',
    participants: 86,
    reward: '$120',
    joinedAt: '昨天加入',
  },
  {
    id: 3,
    title: '算法刷题冲刺营',
    organizer: '算法共学组',
    cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    status: '已结束',
    participants: 203,
    reward: '$66',
    joinedAt: '3天前加入',
  },
];

export const createMyGroupsData = () => DEFAULT_MY_GROUPS.map(item => ({ ...item }));

export const createMyTeamsData = () => DEFAULT_MY_TEAMS.map(item => ({ ...item }));

export const createMyActivitiesData = () => DEFAULT_MY_ACTIVITIES.map(item => ({ ...item }));
