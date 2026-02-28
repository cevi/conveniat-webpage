export class ApprovalRequiredError extends Error {
  public readonly groupName: string;
  public readonly groupUrl: string;

  constructor(message: string, groupName: string, groupUrl: string) {
    super(message);
    this.name = 'ApprovalRequiredError';
    this.groupName = groupName;
    this.groupUrl = groupUrl;
  }
}
