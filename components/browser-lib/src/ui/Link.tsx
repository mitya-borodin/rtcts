import { isFunction } from "@rtcts/utils";
import { History } from "history";
import React, {
  MouseEvent,
  MouseEventHandler,
  PropsWithChildren,
  ReactElement,
  SyntheticEvent,
} from "react";

const isLeftClickEvent = (event: MouseEvent): boolean => {
  return event.button === 0;
};

const isModifiedEvent = (event: MouseEvent): boolean => {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
};

export type LinkProps = PropsWithChildren<{
  history: History;
  to: string;

  onClick?: (event: SyntheticEvent) => void;
}>;

export const Link: React.FC<LinkProps> = (props: LinkProps): ReactElement | null => {
  const { to, children, ...other } = props;

  const onClick: MouseEventHandler = (event: MouseEvent): void => {
    if (isFunction(props.onClick)) {
      props.onClick(event);
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    if (event.defaultPrevented === true) {
      return;
    }

    event.preventDefault();

    props.history.push(to);
  };

  return (
    <a href={to} onClick={onClick} {...other}>
      {children}
    </a>
  );
};
