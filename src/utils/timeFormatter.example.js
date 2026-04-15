/**
 * Time Formatter Utility - Usage Examples
 * 
 * This file demonstrates how to use the time formatting functions
 * with internationalization support.
 */

import { formatTime, formatDate, formatDuration } from './timeFormatter';

// ============================================
// Example 1: Format relative time
// ============================================

// Just now (less than 1 minute ago)
const now = new Date();
console.log(formatTime(now)); 
// Output (zh): "刚刚"
// Output (en): "Just now"

// 2 hours ago
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
console.log(formatTime(twoHoursAgo));
// Output (zh): "2小时前"
// Output (en): "2 hours ago"

// Yesterday
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
console.log(formatTime(yesterday));
// Output (zh): "昨天"
// Output (en): "Yesterday"

// 3 days ago
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
console.log(formatTime(threeDaysAgo));
// Output (zh): "3天前"
// Output (en): "3 days ago"

// More than 7 days ago - shows formatted date
const longAgo = new Date('2024-01-15');
console.log(formatTime(longAgo));
// Output (zh): "2024年01月15日"
// Output (en): "Jan 15, 2024"

// ============================================
// Example 2: Format dates
// ============================================

const someDate = new Date('2024-03-20T14:30:00');

// Default format (no time)
console.log(formatDate(someDate));
// Output (zh): "2024年03月20日"
// Output (en): "Mar 20, 2024"

// With time
console.log(formatDate(someDate, { includeTime: true }));
// Output (zh): "2024年03月20日 14:30"
// Output (en): "Mar 20, 2024, 02:30 PM"

// Short format (no time)
console.log(formatDate(someDate, { short: true }));
// Output (zh): "2024-03-20"
// Output (en): "03/20/2024"

// Short format with time
console.log(formatDate(someDate, { short: true, includeTime: true }));
// Output (zh): "2024-03-20 14:30"
// Output (en): "03/20/2024 14:30"

// ============================================
// Example 3: Format duration (for timers, exams, etc.)
// ============================================

// 5 minutes 30 seconds
console.log(formatDuration(330));
// Output: "05:30"

// 1 hour 15 minutes
console.log(formatDuration(4500));
// Output: "75:00"

// 0 seconds
console.log(formatDuration(0));
// Output: "00:00"

// ============================================
// Example 4: Usage in React Components
// ============================================

/*
import React from 'react';
import { View, Text } from 'react-native';
import { formatTime, formatDate } from '../utils/timeFormatter';

export default function MyComponent({ item }) {
  return (
    <View>
      <Text>{'Display relative time'}</Text>
      <Text>{formatTime(item.createdAt)}</Text>
      
      <Text>{'Display formatted date'}</Text>
      <Text>{formatDate(item.publishedAt)}</Text>
      
      <Text>{'Display date with time'}</Text>
      <Text>{formatDate(item.updatedAt, { includeTime: true })}</Text>
    </View>
  );
}
*/

// ============================================
// Example 5: Handling different input types
// ============================================

// Date object
formatTime(new Date());

// ISO string
formatTime('2024-03-20T14:30:00Z');

// Timestamp (milliseconds)
formatTime(1710944400000);

// Invalid input returns empty string
formatTime(null); // ""
formatTime(undefined); // ""
formatTime(''); // ""
