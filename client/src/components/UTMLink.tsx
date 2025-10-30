import { Link } from 'wouter';
import { useUTMParams } from '@/hooks/use-utm-params';
import { ReactNode, AnchorHTMLAttributes } from 'react';

interface UTMLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  preserveParams?: boolean; // По умолчанию true
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
}

export function UTMLink({ href, preserveParams = true, replace, state, children, ...props }: UTMLinkProps) {
  const { addParamsToURL } = useUTMParams();
  
  // Добавить UTM параметры к URL если нужно
  const enhancedHref = preserveParams ? addParamsToURL(href) : href;
  
  return (
    <Link href={enhancedHref} replace={replace} state={state} {...props}>
      {children}
    </Link>
  );
}
