import { History } from "history";
import * as React from "react";

function isLeftClickEvent(event: any) {
  return event.button === 0;
}

function isModifiedEvent(event: any) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export interface ILinkProps {
  history: History;
  to: string;
  children?: React.ReactNode;

  onClick?: (event: any) => void;
}

export class Link extends React.Component<ILinkProps, any> {
  private handleClick: (event: React.SyntheticEvent) => void;

  constructor(props: ILinkProps, context: any) {
    super(props, context);

    this.handleClick = (event: React.SyntheticEvent) => {
      if (this.props.onClick) {
        this.props.onClick(event);
      }

      if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
        return;
      }

      if (event.defaultPrevented === true) {
        return;
      }

      event.preventDefault();

      this.props.history.push(this.props.to);
    };
  }

  public render() {
    const { to, children, ...props } = this.props;

    return (
      <a href={to} {...props} onClick={this.handleClick}>
        {children}
      </a>
    );
  }
}
