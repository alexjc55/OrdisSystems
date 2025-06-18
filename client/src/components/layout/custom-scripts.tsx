import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export function CustomHeaderScripts() {
  const { storeSettings } = useStoreSettings();

  useEffect(() => {
    if (storeSettings?.headerHtml) {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = storeSettings.headerHtml;

      // Extract script tags and execute them
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        
        // Copy attributes
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy content
        if (script.innerHTML) {
          newScript.innerHTML = script.innerHTML;
        }
        
        // Add to head
        document.head.appendChild(newScript);
      });

      // Extract non-script tags and add to head
      const nonScripts = tempDiv.querySelectorAll(':not(script)');
      nonScripts.forEach((element) => {
        if (element.tagName) {
          const newElement = document.createElement(element.tagName);
          Array.from(element.attributes).forEach(attr => {
            newElement.setAttribute(attr.name, attr.value);
          });
          newElement.innerHTML = element.innerHTML;
          document.head.appendChild(newElement);
        }
      });

      // Cleanup function to remove added elements when component unmounts
      return () => {
        // Remove scripts and elements added by this component
        const addedElements = document.head.querySelectorAll('[data-custom-header]');
        addedElements.forEach(element => element.remove());
      };
    }
  }, [storeSettings?.headerHtml]);

  return null; // This component doesn't render anything visible
}

export function CustomFooterScripts() {
  const { storeSettings } = useStoreSettings();

  useEffect(() => {
    if (storeSettings?.footerHtml) {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = storeSettings.footerHtml;

      // Extract script tags and execute them
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        
        // Copy attributes
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy content
        if (script.innerHTML) {
          newScript.innerHTML = script.innerHTML;
        }
        
        // Mark as custom footer script for cleanup
        newScript.setAttribute('data-custom-footer', 'true');
        
        // Add to body (before closing tag)
        document.body.appendChild(newScript);
      });

      // Extract non-script tags and add to body
      const nonScripts = tempDiv.querySelectorAll(':not(script)');
      nonScripts.forEach((element) => {
        if (element.tagName) {
          const newElement = document.createElement(element.tagName);
          Array.from(element.attributes).forEach(attr => {
            newElement.setAttribute(attr.name, attr.value);
          });
          newElement.innerHTML = element.innerHTML;
          newElement.setAttribute('data-custom-footer', 'true');
          document.body.appendChild(newElement);
        }
      });

      // Cleanup function to remove added elements when component unmounts
      return () => {
        // Remove scripts and elements added by this component
        const addedElements = document.body.querySelectorAll('[data-custom-footer]');
        addedElements.forEach(element => element.remove());
      };
    }
  }, [storeSettings?.footerHtml]);

  return null; // This component doesn't render anything visible
}