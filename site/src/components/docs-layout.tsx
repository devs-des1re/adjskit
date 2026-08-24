import SidebarNav from "./docs/SidebarNav";
import TOCNav from "./docs/TOCNav";
import Breadcrumbs from "./docs/Breadcrumbs";
import PrevNext from "./docs/PrevNext";
import SocialLinks from "./docs/SocialLinks";

interface SidebarItem {
  title: string;
  url: string;
  active?: boolean;
  indexURL?: string;
  collapsible?: boolean;
  expanded?: boolean;
  children?: SidebarItem[];
}

interface TOCItem {
  title: string;
  id: string;
  depth: number;
}

interface BreadcrumbItem {
  label: string;
  url: string;
  isLast: boolean;
}

interface SocialLinkItem {
  icon: string;
  url: string;
  name: string;
}

interface DocLayoutProps {
  pageTitle: string;
  siteTitle: string;
  children: unknown;
  sidebarItems: SidebarItem[];
  tocItems: TOCItem[];
  breadcrumbs: BreadcrumbItem[];
  prevTitle?: string;
  prevLink?: string;
  nextTitle?: string;
  nextLink?: string;
  socialLinks: SocialLinkItem[];
  currentPath: string;
}

export default function DocsLayout(props: DocLayoutProps) {
  const pageTitle = props.pageTitle;
  const siteTitle = props.siteTitle;

  return (
    <div class="docs-page">
      <Head>
        <link rel="stylesheet" href="/docs-styles.css" />
        <link rel="icon" href="/favicon.svg" />
        <title>{pageTitle} - {siteTitle}</title>
      </Head>

      <header class="docs-navbar">
        <a class="navbar-title" href="/docs/">{siteTitle}</a>
        <div class="navbar-actions">
          <div class="navbar-social-links">
            <SocialLinks links={props.socialLinks} />
          </div>
          <button class="theme-toggle" id="theme-toggle" aria-label="Toggle light mode" type="button">
            <Icon name="tabler:sun" width="16" height="16" />
            <Icon name="tabler:moon" width="16" height="16" />
          </button>
          <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">
            <Icon name="tabler:menu" width="20" height="20" />
          </button>
        </div>
      </header>

      <div class="toc-mobile-shell">
        <button class="toc-mobile-toggle" id="toc-toggle" aria-label="Toggle table of contents" aria-controls="toc" aria-expanded="false">
          <span class="toc-mobile-copy">
            <span class="toc-mobile-label">On this page</span>
            <span class="toc-current" id="toc-current">{props.pageTitle}</span>
          </span>
          <Icon name="tabler:chevron-down" width="18" height="18" />
        </button>
      </div>

      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-header-row">
            <a class="sidebar-brand" href="/docs/">{siteTitle}</a>
            <button class="sidebar-close" id="sidebar-close" aria-label="Close navigation">
              <Icon name="tabler:x" width="18" height="18" />
            </button>
          </div>
        </div>
        <SidebarNav items={props.sidebarItems} currentPath={props.currentPath} />
      </nav>

      <div class="docs-body">
        <main class="docs-main">
          <Breadcrumbs items={props.breadcrumbs} />
          <div class="docs-content">{props.children}</div>
          <PrevNext
            prevTitle={props.prevTitle}
            prevLink={props.prevLink}
            nextTitle={props.nextTitle}
            nextLink={props.nextLink}
          />
        </main>

        <aside class="toc" id="toc">
          <div class="toc-panel">
            <div class="toc-header">
              <Icon name="lucide:text-align-start" width="16" height="16" />
              <span>On this page</span>
            </div>
            <TOCNav items={props.tocItems} />
          </div>
        </aside>
      </div>

      <footer class="docs-footer">
        <span>&copy; 2026 adjskit. All rights reserved.</span>
        <a href="https://github.com/devs-des1re/adjskit/blob/main/LICENSE">
          Released under the MIT License
        </a>
      </footer>

      <script src="/docs-script.js" />
    </div>
  );
}
