type BoostPolicyWorkflowState =
  | { status: "idle" }
  | { status: "updating" }
  | { status: "failed"; message: string };

type BoostPolicyWorkflowEvent =
  | { type: "owner-changed" }
  | { type: "update-started" }
  | { type: "update-succeeded" }
  | { type: "update-failed"; message: string };

export const INITIAL_BOOST_POLICY_WORKFLOW_STATE: BoostPolicyWorkflowState = { status: "idle" };

export function reduceBoostPolicyWorkflow(
  _state: BoostPolicyWorkflowState,
  event: BoostPolicyWorkflowEvent,
): BoostPolicyWorkflowState {
  switch (event.type) {
    case "owner-changed":
      return INITIAL_BOOST_POLICY_WORKFLOW_STATE;
    case "update-started":
      return { status: "updating" };
    case "update-succeeded":
      return { status: "idle" };
    case "update-failed":
      return { status: "failed", message: event.message };
  }
}
