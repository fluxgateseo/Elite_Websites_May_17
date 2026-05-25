export type TriggerArgs = {
  workflowUrl: string;
  sharedSecret: string;
  domain: string;
  briefId: string;
  jobId: string;
  userId?: string;
  dryRun?: boolean;
  fetcher?: typeof fetch;
};

export async function triggerPipeline(args: TriggerArgs): Promise<{ id: string; status: { status: string } }> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher(`${args.workflowUrl.replace(/\/$/, "")}/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pipeline-secret": args.sharedSecret,
    },
    body: JSON.stringify({
      domain: args.domain,
      briefId: args.briefId,
      jobId: args.jobId,
      userId: args.userId,
      dryRun: args.dryRun,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`workflow trigger ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as { id: string; status: { status: string } };
}

export async function getPipelineStatus(args: { workflowUrl: string; sharedSecret: string; instanceId: string; fetcher?: typeof fetch }): Promise<{ id: string; status: { status: string } }> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher(`${args.workflowUrl.replace(/\/$/, "")}/status/${encodeURIComponent(args.instanceId)}`, {
    headers: { "x-pipeline-secret": args.sharedSecret },
  });
  if (!res.ok) {
    throw new Error(`workflow status ${res.status}`);
  }
  return (await res.json()) as { id: string; status: { status: string } };
}
