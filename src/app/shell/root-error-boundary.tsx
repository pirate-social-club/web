"use client";

import * as React from "react";

import { RootAppErrorState } from "@/components/states/route-error-states";
import { logger } from "@/lib/logger";

type RootErrorBoundaryProps = {
  children: React.ReactNode;
  description: string;
  homeLabel: string;
  resetKey: string;
  title: string;
};

type RootErrorBoundaryState = {
  hasError: boolean;
};

export class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("[root-error-boundary] uncaught render error", {
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  public componentDidUpdate(previousProps: RootErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <RootAppErrorState
          description={this.props.description}
          homeLabel={this.props.homeLabel}
          title={this.props.title}
        />
      );
    }

    return this.props.children;
  }
}
