import type { UseGlobalHandleFlowReturn } from "@/hooks/use-global-handle-flow";

export type EditProfileFormValues = {
  displayName: string;
  bio: string;
};

export type EditProfileFieldError = {
  field: "displayName" | "bio";
  message: string;
};

export type EditProfileSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export type EditProfileFormProps = {
  className?: string;
  currentAvatarSeed?: string;
  currentAvatarSrc?: string;
  currentBio?: string;
  currentDisplayName: string;
  currentHandle?: string;
  fieldErrors: EditProfileFieldError[];
  handleFlow?: Pick<
    UseGlobalHandleFlowReturn,
    "draft" | "preview" | "state" | "setDraft" | "checkAvailability" | "submitRename" | "resetState"
  >;
  onChange?: (values: EditProfileFormValues) => void;
  onSubmit?: (values: EditProfileFormValues) => void;
  submitState: EditProfileSubmitState;
  values: EditProfileFormValues;
};
