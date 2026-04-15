import { buildProblemToHeroLocalInviteText } from '../shareService';

describe('shareService', () => {
  it('builds a local invite message with inviter, title, and share url', () => {
    const message = buildProblemToHeroLocalInviteText({
      inviterName: 'Alice',
      targetName: '小王',
      title: '如何快速入门 Python？',
      shareUrl: 'problemvshero://question/123',
    });

    expect(message).toContain('小王，你好');
    expect(message).toContain('我是 Alice');
    expect(message).toContain('如何快速入门 Python？');
    expect(message).toContain('problemvshero://question/123');
  });
});
