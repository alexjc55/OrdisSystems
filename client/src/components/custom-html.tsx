import { useEffect } from 'react';

interface CustomHtmlProps {
  html: string;
  type: 'head' | 'footer';
}

export function CustomHtml({ html, type }: CustomHtmlProps) {
  useEffect(() => {
    if (!html) return;

    if (type === 'head') {
      // For head scripts, we need to append to document head
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Extract script tags and execute them
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.innerHTML = script.innerHTML;
        }
        // Copy attributes
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        document.head.appendChild(newScript);
      });

      // Extract other elements (like meta tags, link tags)
      const otherElements = tempDiv.querySelectorAll(':not(script)');
      otherElements.forEach((element) => {
        document.head.appendChild(element.cloneNode(true));
      });

      // Cleanup function
      return () => {
        // Remove added scripts and elements when component unmounts
        scripts.forEach((script) => {
          const addedScript = document.head.querySelector(`script[src="${script.src}"]`) || 
                             Array.from(document.head.querySelectorAll('script')).find(s => 
                               !s.src && s.innerHTML === script.innerHTML
                             );
          if (addedScript) {
            document.head.removeChild(addedScript);
          }
        });
      };
    }
  }, [html, type]);

  if (type === 'footer') {
    // For footer HTML, render as dangerouslySetInnerHTML
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // For head HTML, we don't render anything visible
  return null;
}