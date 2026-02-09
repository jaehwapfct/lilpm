// Issue module - Re-exports all issue-related services
export { issueService, type IssueWithRelations } from './issueService';
export { labelService } from './labelService';
export { commentService, type CommentWithUser } from './commentService';
export { issueActivityService, type ActivityWithUser } from './issueActivityService';
export { dependencyService } from './dependencyService';

// Re-export activityService as alias for backward compatibility
export { issueActivityService as activityService } from './issueActivityService';
