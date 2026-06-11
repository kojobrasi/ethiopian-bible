/**
 * Generates HTML content for rendering EPUB and PDF files in a WebView.
 *
 * For EPUB: Uses ePub.js library loaded from CDN to parse and render the book.
 * For PDF: Embeds using an iframe with native PDF viewer.
 */

// ─── EPUB viewer HTML (uses ePub.js) ─────────────────────────────────────────

export function generateEpubViewerHtml(base64Content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Reader</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #FAFAF4; color: #1C1408; font-family: Georgia, 'Times New Roman', serif; }
    
    #viewer-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    
    #viewer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }
    
    #viewer iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    /* Controls overlay */
    #controls {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: rgba(8, 15, 28, 0.9);
      color: #F0F4FF;
      font-size: 14px;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    #controls.show { opacity: 1; }
    
    .ctrl-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #F0F4FF;
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-family: -apple-system, sans-serif;
    }
    .ctrl-btn:active { background: rgba(255,255,255,0.2); }
    .ctrl-btn:disabled { opacity: 0.3; pointer-events: none; }
    
    #page-info { font-size: 13px; color: #8AAAC8; }
    #progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 3px;
      background: #C8A84B;
      transition: width 0.3s ease;
    }
    
    /* Loading */
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #8AAAC8;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(200,168,75,0.2);
      border-top-color: #C8A84B;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Tap zones for page turning */
    .tap-zone {
      position: absolute;
      top: 0;
      bottom: 60px;
      width: 35%;
      z-index: 10;
      cursor: pointer;
    }
    #tap-left { left: 0; }
    #tap-right { right: 0; }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <div>Loading book...</div>
  </div>
  
  <div id="viewer-container">
    <div id="progress-bar"></div>
    <div id="viewer"></div>
    <div id="tap-left" class="tap-zone"></div>
    <div id="tap-right" class="tap-zone"></div>
  </div>
  
  <div id="controls" class="show">
    <button class="ctrl-btn" id="prev-btn">← Prev</button>
    <span id="page-info">Page 1 of ?</span>
    <button class="ctrl-btn" id="next-btn">Next →</button>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
  <script>
    (function() {
      var BOOK_DATA = 'data:application/epub+zip;base64,' + '${base64Content}';
      
      var book, rendition;
      var currentLocation = null;
      var totalLocations = 0;
      
      var loadingEl = document.getElementById('loading');
      var viewerEl = document.getElementById('viewer');
      var prevBtn = document.getElementById('prev-btn');
      var nextBtn = document.getElementById('next-btn');
      var pageInfo = document.getElementById('page-info');
      var progressBar = document.getElementById('progress-bar');
      var controlsEl = document.getElementById('controls');
      
      // Auto-hide controls after inactivity
      var hideTimer = null;
      function showControls() {
        controlsEl.classList.add('show');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function() {
          controlsEl.classList.remove('show');
        }, 3000);
      }
      document.addEventListener('touchstart', showControls);
      document.addEventListener('mousemove', showControls);
      showControls();
      
      // Tap zones
      document.getElementById('tap-left').addEventListener('click', function() {
        if (rendition) rendition.prev();
        showControls();
      });
      document.getElementById('tap-right').addEventListener('click', function() {
        if (rendition) rendition.next();
        showControls();
      });
      
      try {
        book = ePub(BOOK_DATA);
        
        rendition = book.renderTo('viewer', {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          method: 'default'
        });
        
        var displayed = rendition.display();
        
        // Get total locations when ready
        book.ready.then(function() {
          return book.locations.generate(1024);
        }).then(function(locations) {
          totalLocations = locations.length();
          loadingEl.style.display = 'none';
          updatePageInfo();
        }).catch(function(err) {
          console.error('Location generation error:', err);
          loadingEl.style.display = 'none';
        });
        
        // Scripture linkification: walk the rendered content and identify Bible references
        function linkifyScriptureInEpub() {
          try {
            var iframeEl = viewerEl.querySelector('iframe');
            if (!iframeEl || !iframeEl.contentDocument || !iframeEl.contentDocument.body) return;
            var doc = iframeEl.contentDocument;
            if (doc.querySelector('.scripture-link')) return;
            
            var BOOKS = [
              {num:10,names:["Gen","Ge","Genesis"]},{num:20,names:["Exod","Ex","Exo","Exodus"]},
              {num:30,names:["Lev","Le","Levi","Leviticus"]},{num:40,names:["Num","Nu","Numb","Numbers"]},
              {num:50,names:["Deut","De","Deu","Deuteronomy"]},{num:60,names:["Josh","Jos","Joshua"]},
              {num:70,names:["Judg","Jdg","Jdgs","Judges"]},{num:80,names:["Ruth","Ru"]},
              {num:90,names:["1 Sam","1Sam","1 Sa","1Sa","1 Samuel"]},{num:100,names:["2 Sam","2Sam","2 Sa","2Sa","2 Samuel"]},
              {num:110,names:["1 Kgs","1Kgs","1 Ki","1Ki","1 Kings"]},{num:120,names:["2 Kgs","2Kgs","2 Ki","2Ki","2 Kings"]},
              {num:130,names:["1 Chr","1Chr","1 Ch","1Ch","1 Chron","1 Chronicles"]},{num:140,names:["2 Chr","2Chr","2 Ch","2Ch","2 Chron","2 Chronicles"]},
              {num:150,names:["Ezra","Ezr","Ez"]},{num:160,names:["Neh","Ne","Nehemiah"]},
              {num:190,names:["Esth","Est","Es","Esther"]},{num:220,names:["Job"]},
              {num:230,names:["Ps","Psa","Psm","Pss","Psalm","Psalms"]},{num:240,names:["Prov","Pro","Pr","Proverbs"]},
              {num:250,names:["Eccl","Ecc","Ec","Ecclesiastes"]},{num:260,names:["Song","So","SOS","Song of Sol","Song of Solomon"]},
              {num:290,names:["Isa","Is","Isaiah"]},{num:300,names:["Jer","Je","Jeremiah"]},
              {num:310,names:["Lam","La","Lamentations"]},{num:330,names:["Ezek","Eze","Ezekiel"]},
              {num:340,names:["Dan","Da","Dnl","Daniel"]},{num:350,names:["Hos","Ho","Hosea"]},
              {num:360,names:["Joel","Joe"]},{num:370,names:["Amos","Am","Amo"]},
              {num:380,names:["Obad","Ob","Oba","Obadiah"]},{num:390,names:["Jonah","Jon","Jnh"]},
              {num:400,names:["Mic","Mi","Micah"]},{num:410,names:["Nah","Na","Nahum"]},
              {num:420,names:["Hab","Ha","Habakkuk"]},{num:430,names:["Zeph","Zep","Zephaniah"]},
              {num:440,names:["Hag","Ha","Haggai"]},{num:450,names:["Zech","Zec","Zechariah"]},
              {num:460,names:["Mal","Ml","Malachi"]},{num:470,names:["Matt","Mt","Mat","Matthew"]},
              {num:480,names:["Mark","Mk","Mrk"]},{num:490,names:["Luke","Lk","Luk"]},
              {num:500,names:["John","Jn","Joh"]},{num:510,names:["Acts","Act","Ac"]},
              {num:520,names:["Rom","Ro","Romans"]},{num:530,names:["1 Cor","1Cor","1 Co","1Co","1 Corinthians"]},
              {num:540,names:["2 Cor","2Cor","2 Co","2Co","2 Corinthians"]},{num:550,names:["Gal","Ga","Galatians"]},
              {num:560,names:["Eph","Ep","Ephesians"]},{num:570,names:["Phil","Php","Philippians"]},
              {num:580,names:["Col","Co","Colossians"]},{num:590,names:["1 Thess","1Thess","1 Thes","1Thes","1 Th","1Th","1 Thessalonians"]},
              {num:600,names:["2 Thess","2Thess","2 Thes","2Thes","2 Th","2Th","2 Thessalonians"]},
              {num:610,names:["1 Tim","1Tim","1 Ti","1Ti","1 Timothy"]},{num:620,names:["2 Tim","2Tim","2 Ti","2Ti","2 Timothy"]},
              {num:630,names:["Titus","Tit","Ti"]},{num:640,names:["Philemon","Phm","Phile"]},
              {num:650,names:["Heb","He","Hebrews"]},{num:660,names:["James","Jas","Ja"]},
              {num:670,names:["1 Pet","1Pet","1 Pe","1Pe","1 Peter"]},{num:680,names:["2 Pet","2Pet","2 Pe","2Pe","2 Peter"]},
              {num:690,names:["1 Jn","1Jn","1 Jo","1Jo","1 Joh","1John","1 John"]},{num:700,names:["2 Jn","2Jn","2 Jo","2Jo","2 Joh","2 John"]},
              {num:710,names:["3 Jn","3Jn","3 Jo","3Jo","3 Joh","3 John"]},{num:720,names:["Jude","Jud"]},
              {num:730,names:["Rev","Re","Revelation","Revelations"]},
              {num:731,names:["1 Esd","1Esd","1 Es","1Es","1 Esdras"]},{num:732,names:["2 Esd","2Esd","2 Es","2Es","2 Esdras"]},
              {num:733,names:["Tobit","Tob","To"]},{num:734,names:["Judith","Jdt","Jd"]},
              {num:744,names:["1 Macc","1Macc","1 Mac","1Mac","1 Ma","1Ma","1 Maccabees"]},{num:745,names:["2 Macc","2Macc","2 Mac","2Mac","2 Ma","2Ma","2 Maccabees"]},
            ];
            
            // Build a combined pattern: all abbreviations sorted longest-first
            var allNames = [];
            BOOKS.forEach(function(b) { b.names.forEach(function(n) { allNames.push({book:b.num, name:n}); }); });
            allNames.sort(function(a,b) { return b.name.length - a.name.length; });
            
            // Simple escaping for regex special chars
            function esc(s) {
              return s.replace(/[\.\^\$\*\+\?\{\}\(\)\|\[\]\\]/g, function(c) { return "\\" + c; });
            }
            var pattern = allNames.map(function(n) { return esc(n.name); }).join('|');
            var fullRe = new RegExp('(?:' + pattern + ')\\s*(\\d{1,3})(?::(\\d{1,3}))?(?:-(\\d{1,3}))?', 'gi');
            
            // Walk text nodes
            var tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [];
            while (tw.nextNode()) nodes.push(tw.currentNode);
            
            nodes.forEach(function(textNode) {
              var text = textNode.textContent;
              if (!text || text.length < 4 || text.length > 5000) return;
              var parent = textNode.parentNode;
              if (!parent || parent.tagName === 'A' || parent.closest('a')) return;
              
              fullRe.lastIndex = 0;
              var m;
              var replacements = [];
              while ((m = fullRe.exec(text)) !== null) {
                var matchedName = m[0].match(/^[a-zA-Z0-9\\s.]+/)[0].trim();
                var ch = parseInt(m[1], 10), vs = m[2] ? parseInt(m[2], 10) : 1, endVs = m[3] ? parseInt(m[3], 10) : undefined;
                if (ch < 1 || ch > 200 || vs < 1 || vs > 200) continue;
                
                // Find matching book
                var matchedBook = null;
                var nameLower = matchedName.toLowerCase().replace(/[.\\s]/g, '');
                for (var bi = 0; bi < BOOKS.length; bi++) {
                  for (var ni = 0; ni < BOOKS[bi].names.length; ni++) {
                    var key = BOOKS[bi].names[ni].toLowerCase().replace(/[.\\s]/g, '');
                    if (key === nameLower) { matchedBook = BOOKS[bi].num; break; }
                  }
                  if (matchedBook) break;
                }
                if (!matchedBook) continue;
                
                replacements.push({
                  start: m.index,
                  end: m.index + m[0].length,
                  book: matchedBook,
                  chapter: ch,
                  verse: vs,
                  endVerse: endVs
                });
              }
              
              if (replacements.length === 0) return;
              
              var fragment = doc.createDocumentFragment();
              var lastIdx = 0;
              replacements.forEach(function(ref) {
                if (ref.start > lastIdx) {
                  fragment.appendChild(doc.createTextNode(text.slice(lastIdx, ref.start)));
                }
                var refText = text.slice(ref.start, ref.end);
                var navPath = '/bible?book=' + ref.book + '&chapter=' + ref.chapter + '&verse=' + ref.verse;
                if (ref.endVerse) navPath += '&endVerse=' + ref.endVerse;
                
                var anchor = doc.createElement('a');
                anchor.href = navPath;
                anchor.textContent = refText;
                anchor.className = 'scripture-link';
                anchor.style.color = '#C8A84B';
                anchor.style.textDecoration = 'underline';
                anchor.style.cursor = 'pointer';
                anchor.addEventListener('click', function(e) {
                  e.preventDefault();
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type:'BIBLE_REF',ref:navPath}));
                  }
                });
                fragment.appendChild(anchor);
                lastIdx = ref.end;
              });
              if (lastIdx < text.length) {
                fragment.appendChild(doc.createTextNode(text.slice(lastIdx)));
              }
              parent.replaceChild(fragment, textNode);
            });
          } catch(e) {
            console.error('Scripture linkification error:', e);
          }
        }
        
        rendition.on('rendered', function(section) {
          if (loadingEl) loadingEl.style.display = 'none';
          updatePageInfo();
          setTimeout(linkifyScriptureInEpub, 300);
        });
        
        rendition.on('relocated', function(location) {
          currentLocation = location;
          updatePageInfo();
          
          // Send progress back to React Native
          if (window.ReactNativeWebView && location.start) {
            var progress = {
              type: 'progress',
              currentPage: location.start.location || 0,
              totalPages: totalLocations || 0,
              percentage: totalLocations > 0 ? (location.start.location / totalLocations * 100) : 0
            };
            window.ReactNativeWebView.postMessage(JSON.stringify(progress));
          }
        });
        
        // Button handlers
        prevBtn.addEventListener('click', function() {
          if (rendition) rendition.prev();
          showControls();
        });
        nextBtn.addEventListener('click', function() {
          if (rendition) rendition.next();
          showControls();
        });
        
        // Keyboard support
        document.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowLeft') { rendition.prev(); showControls(); }
          if (e.key === 'ArrowRight') { rendition.next(); showControls(); }
        });
        
      } catch (e) {
        loadingEl.innerHTML = '<div style="color:#C0392B;font-size:18px;">⚠</div><div style="margin-top:8px;color:#C0392B;">Unable to open this EPUB file.<br>It may be corrupted or encrypted.</div>';
        console.error('EPUB load error:', e);
      }
      
      function updatePageInfo() {
        if (!rendition) return;
        var loc = currentLocation;
        if (loc && loc.start) {
          var current = loc.start.location || 0;
          var total = totalLocations || 0;
          pageInfo.textContent = 'Page ' + Math.floor(current) + ' of ' + (total > 0 ? Math.floor(total) : '?');
          if (total > 0) {
            var pct = Math.min(100, Math.max(0, (current / total) * 100));
            progressBar.style.width = pct + '%';
          }
        }
      }
    })();
  </script>
</body>
</html>`;
}

// ─── PDF viewer HTML (uses native PDF viewer via iframe) ──────────────────────

export function generatePdfViewerHtml(base64Content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
  <title>PDF Reader</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #525659; }
    
    #pdf-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    #toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #323639;
      color: #F0F4FF;
      font-size: 14px;
      font-family: -apple-system, sans-serif;
    }
    
    #page-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .ctrl-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #F0F4FF;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    .ctrl-btn:active { background: rgba(255,255,255,0.2); }
    .ctrl-btn:disabled { opacity: 0.3; pointer-events: none; }
    
    #page-input {
      width: 50px;
      text-align: center;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #F0F4FF;
      padding: 4px;
      border-radius: 4px;
      font-size: 13px;
    }
    
    #viewer-frame {
      flex: 1;
      border: none;
    }
    
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #8AAAC8;
      font-family: -apple-system, sans-serif;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(200,168,75,0.2);
      border-top-color: #C8A84B;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <div>Loading PDF...</div>
  </div>
  
  <div id="pdf-container" style="display:none;">
    <div id="toolbar">
      <span id="filename">PDF Document</span>
      <div id="page-controls">
        <button class="ctrl-btn" id="prev-page">←</button>
        <input type="number" id="page-input" value="1" min="1">
        <span>/ <span id="total-pages">?</span></span>
        <button class="ctrl-btn" id="next-page">→</button>
      </div>
    </div>
    <iframe id="viewer-frame" src=""></iframe>
  </div>
  
  <script>
    (function() {
      var loadingEl = document.getElementById('loading');
      var containerEl = document.getElementById('pdf-container');
      var iframeEl = document.getElementById('viewer-frame');
      var prevBtn = document.getElementById('prev-page');
      var nextBtn = document.getElementById('next-page');
      var pageInput = document.getElementById('page-input');
      var totalPagesEl = document.getElementById('total-pages');
      
      // Use the native PDF viewer with the base64 data URI
      var pdfDataUri = 'data:application/pdf;base64,${base64Content}';
      
      // For modern browsers, use the built-in PDF viewer
      iframeEl.src = pdfDataUri;
      
      iframeEl.onload = function() {
        loadingEl.style.display = 'none';
        containerEl.style.display = 'flex';
        
        // Try to communicate with the PDF viewer
        try {
          // Send ready message
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          }
        } catch(e) {}
      };
      
      // Page navigation via iframe's contentWindow
      prevBtn.addEventListener('click', function() {
        var val = parseInt(pageInput.value) - 1;
        if (val >= 1) {
          pageInput.value = val;
          // The native PDF viewer handles pages internally
          // We just track the page number
        }
      });
      
      nextBtn.addEventListener('click', function() {
        var val = parseInt(pageInput.value) + 1;
        pageInput.value = val;
      });
      
      pageInput.addEventListener('change', function() {
        var val = parseInt(this.value);
        if (val < 1) this.value = 1;
      });
      
      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn.click();
      });
    })();
  </script>
</body>
</html>`;
}
