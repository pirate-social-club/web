"use client";

import type { MembershipRequestSummary } from "@pirate/api-contracts";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { buildPublicProfilePath } from "@/lib/profile-routing";

export interface CommunityMembershipRequestsPageProps {
  loading?: boolean;
  onApprove: (request: MembershipRequestSummary) => void;
  onReject: (request: MembershipRequestSummary) => void;
  processingRequestId?: string | null;
  requests: MembershipRequestSummary[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getApplicantLabel(request: MembershipRequestSummary): string {
  return request.applicant_handle?.trim() || "Member";
}

export function CommunityMembershipRequestsPage({
  loading = false,
  onApprove,
  onReject,
  processingRequestId,
  requests,
}: CommunityMembershipRequestsPageProps) {
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="space-y-2">
        <Type as="h1" variant="h2">Requests</Type>
        <Type as="p" className="max-w-2xl text-muted-foreground" variant="body">
          Review who can join this community.
        </Type>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">Loading requests...</Type>
          </div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">No pending requests.</Type>
          </div>
        ) : (
          <div>
            {requests.map((request, index) => {
              const applicantLabel = getApplicantLabel(request);
              const profileHref = request.applicant_handle ? buildPublicProfilePath(request.applicant_handle) : null;
              const processing = processingRequestId === request.membership_request_id;

              return (
                <div key={request.membership_request_id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start">
                    <a
                      className="flex min-w-0 flex-1 items-start gap-3"
                      href={profileHref ?? undefined}
                      onClick={(event) => {
                        if (!profileHref) event.preventDefault();
                      }}
                    >
                      <Avatar fallback={applicantLabel} fallbackSeed={request.applicant_user_id} size="md" src={request.applicant_avatar_ref ?? undefined} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                          <Type as="span" className="min-w-0 truncate" variant="body-strong">
                            {applicantLabel}
                          </Type>
                          <Type as="span" className="text-muted-foreground" variant="caption">
                            {formatDate(request.created_at)}
                          </Type>
                        </div>
                        {request.note?.trim() ? (
                          <Type as="p" className="mt-2 whitespace-pre-wrap text-muted-foreground" variant="body">
                            {request.note}
                          </Type>
                        ) : (
                          <Type as="p" className="mt-2 text-muted-foreground" variant="body">
                            No message.
                          </Type>
                        )}
                      </div>
                    </a>

                    <div className="flex shrink-0 gap-2 md:justify-end">
                      <Button
                        disabled={processing}
                        loading={processing}
                        onClick={() => onApprove(request)}
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={processing}
                        onClick={() => onReject(request)}
                        variant="secondary"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
