export function uploadHTML( title: string, body: string, css: string[], fileName: string ): void {
  const styles = css
    .map( ( style ) => ( `<style type="text/css">${ style }</style>` ) )
    .join( "\n\r" );

  const html = `
      <!DOCTYPE html>
        <html lang="en">
          <head>
              <meta charset="UTF-8">
              <title>${title}</title>
              ${styles}
          </head>
          <body>${body}</body>
        </html>
      `;

  const blob = new Blob( [ html ], { type: "text/html" } );
  const a = document.createElement( "a" );
  const url = URL.createObjectURL( blob );

  a.href = url;
  a.download = `${fileName}.html`;

  document.body.appendChild( a );

  a.click();

  document.body.removeChild( a );
  window.URL.revokeObjectURL( url );
}
