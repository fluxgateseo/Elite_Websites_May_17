// Type stubs for cloudflare:workers virtual module (for testing)
export class WorkflowEntrypoint<E, P> {
  async run(event: WorkflowEvent<P>, step: WorkflowStep): Promise<unknown> {
    return null;
  }
}

export interface WorkflowEvent<P> {
  payload: P;
}

export interface WorkflowStep {
  do<T>(name: string, handler: () => Promise<T>): Promise<T>;
}

export interface Workflow {
  create(options: { params: unknown }): Promise<{ id: string; status(): Promise<{ status: string }> }>;
}
