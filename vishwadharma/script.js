// Global flag to indicate if the Google Translate widget has successfully initialized its DOM
let translateLoaded = false;

// Define the HTML content strings globally so they are accessible
const hideHtml = '<span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span> अनुवाद छुपाएँ';
const showHtml = '<span class="emoji-pulse">😮</span>Experience the Granth in your mother tongue<span class="emoji-spin">🌍</span>';
// New loading HTML using the sand clock emoji class
const loadingHtml = 'अनुवाद लोड हो रहा है... <span class="emoji-sandclock">⌛</span>';


// Google Translate Initialization function (callback for the script)
// This function is called by the Google Translate script itself (via the `cb=googleTranslateElementInit` URL parameter)
function googleTranslateElementInit() {
  // Console logs for development/validation. Conditionally remove for production.
  console.log('Google Translate Element Initializing...');
  try {
    const newIncludedLanguages = 'en,hi,es,ar,fr,zh-CN,ru,de,bn,pt,ja,ur,ta,pa,ko,it,tr,nl,id,vi,th,ml,te,mr,gu,kn'; // Added more languages

    const translateWidget = new google.translate.TranslateElement({
      pageLanguage: 'hi',
      includedLanguages: newIncludedLanguages,
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false // Crucial: Prevents immediate display until button click
    }, 'google_translate_element');
    console.log('Google Translate Element Initialized.');

    // --- Post-Initialization Actions ---
    const widgetDiv = document.getElementById('google_translate_element');
    const translateButton = document.getElementById('translateBtn');

    let observerTimeout; // Declare timeout variable

    const observer = new MutationObserver((mutations, obs) => {
      // Check if the main Google Translate widget structure is present
      // The widget injects a div with class 'goog-te-gadget-simple' inside the target div
      if (widgetDiv && widgetDiv.children.length > 0 && widgetDiv.querySelector('.goog-te-gadget-simple')) {
        console.log('Google Translate widget DOM rendered by Google script.');
        translateLoaded = true; // Set the flag
        obs.disconnect(); // Stop observing once the widget is found
        clearTimeout(observerTimeout); // Clear the timeout as we've succeeded

        if (translateButton) {
          translateButton.disabled = false; // Enable the button now that the widget is ready

          // Check button innerHTML to see if it was in the loading state (contains sandclock emoji)
          // If it was clicked during loading, assume the user wants to see the widget now
          if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) { // <--- CHECK FOR LOADING STATE
            console.log('User clicked Translate button during script load. Showing widget.');
            // Set the button to the "hide" state HTML and show the widget
            translateButton.innerHTML = hideHtml; // Set to the "hide" state HTML
            widgetDiv.style.display = 'flex'; // Or block/inline-block depending on layout
            translateButton.setAttribute('aria-expanded', 'true');
            widgetDiv.setAttribute('aria-hidden', 'false'); // Make visible for screen readers
            widgetDiv.classList.remove('google-translate-hidden'); // Remove the hiding class
          } else {
             console.log('Google Translate widget initialized. Keeping hidden as per button state.');
             // Widget initialized, but button wasn't clicked during load or is already in show state
             widgetDiv.style.display = 'none'; // Keep hidden initially
             widgetDiv.setAttribute('aria-hidden', 'true'); // Keep hidden for screen readers
             widgetDiv.classList.add('google-translate-hidden'); // Ensure the hiding class is on the container
             translateButton.setAttribute('aria-expanded', 'false');
              // Ensure button text is correct if not in hide state (should be the original showHtml)
              // We can just force it to showHtml here if it's not the hideHtml
              if (!translateButton.innerHTML.includes('अनुवाद छुपाएँ')) { // <--- Check if it's NOT the hide state
                   translateButton.innerHTML = showHtml; // Restore original HTML
                   console.log('Translate button HTML reset to initial state after widget load.');
              }
          }
        } else {
             console.warn('Translate button #translateBtn not found after widget initialized.');
        }
      } else {
         // This happens if the widget is not yet injected into the DOM by the Google script
         // console.log('Waiting for Google Translate widget DOM...'); // Too noisy, uncomment if needed
      }
    });

    // Set a timeout to detect if the Google Translate script fails to load or render the widget DOM
    observerTimeout = setTimeout(() => {
        if (!translateLoaded) {
            console.warn('MutationObserver timed out or Google Translate script failed to render the widget DOM within 10 seconds.');
            const btn = document.getElementById('translateBtn');
            if (btn) {
                 // If the button was in a loading state, update it to an error state
                 if(btn.innerHTML.includes('<span class="emoji-sandclock">')) { // <--- CHECK FOR LOADING STATE ON TIMEOUT
                     btn.innerHTML = 'अनुवाद लोड नहीं हो सका <span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span>'; // Set error state
                     btn.disabled = false; // Enable the button (maybe the user can try again?)
                 } else {
                     // If the button wasn't clicked but the widget failed, just ensure it's enabled and visible with default text
                      btn.disabled = false; // Ensure button is clickable
                       // Ensure button text is the default showHtml if it wasn't the loading text
                       if (!btn.innerHTML.includes('अनुवाद छुपाएँ')) { // <--- Check if it's NOT the hide state
                           btn.innerHTML = showHtml;
                       }
                      console.log('Translate button enabled after widget load timeout (not in loading state).');
                 }
                 btn.setAttribute('aria-expanded', 'false');
            } else {
                 console.warn('Translate button #translateBtn not found during timeout.');
            }
             const widget = document.getElementById('google_translate_element');
             if (widget) {
                 widget.style.display = 'none';
                 widget.setAttribute('aria-hidden', 'true');
                 widget.classList.add('google-translate-hidden'); // Ensure it's hidden in CSS too
             } else {
                 console.warn('Translate widget div #google_translate_element not found during timeout.');
             }
            translateLoaded = false; // Ensure flag is false
            observer.disconnect(); // Stop observing
        }
    }, 10000); // 10 seconds timeout - adjust if needed

     // Start observing the widget container for changes
     if(widgetDiv) {
        // Use requestAnimationFrame to wait for the browser to potentially finish layout
        // before starting observation, although `childList` on the target div is usually sufficient.
        // A small timeout is also an option if raf isn't reliable enough.
        setTimeout(() => { // Using a small timeout instead of raf for simplicity
             observer.observe(widgetDiv, { childList: true, subtree: true });
             console.log('MutationObserver started on #google_translate_element');
        }, 50); // Small delay
     } else {
         // Handle the case where the target div is missing entirely from the HTML
         console.error('Google Translate widget div #google_translate_element not found on page load. Cannot initialize or observe.');
         clearTimeout(observerTimeout); // Clear the timeout if we can't even find the target div
         const btn = document.getElementById('translateBtn');
            if (btn) {
                 // Update error text when div is missing
                 btn.innerHTML = 'अनुवाद div नहीं मिला <span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span>'; // <--- Error HTML
                 btn.disabled = true; // Disable button if the target div is missing
                 btn.setAttribute('aria-expanded', 'false');
            } else {
                console.warn('Translate button #translateBtn not found when widget div is missing.');
            }
         translateLoaded = false; // Ensure flag is false
         // No need to disconnect observer as it was never started
     }

  } catch (error) {
    // Catch any errors during the initialization process itself (e.g. google.translate is not defined)
    console.error('Error initializing Google Translate Element:', error);
    const translateButton = document.getElementById('translateBtn');
     if (translateButton) {
        translateButton.disabled = false; // Enable button
         // Check if it was in the loading state before error
         if(translateButton.innerHTML.includes('<span class="emoji-sandclock">')){ // <--- CHECK FOR LOADING STATE ON ERROR
              translateButton.innerHTML = 'अनुवाद लोड नहीं हो सका <span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span>'; // Set error state
         } else {
             translateButton.innerHTML = showHtml; // Reset to original if not in loading state
         }
        translateButton.setAttribute('aria-expanded', 'false');
     } else {
        console.warn('Translate button #translateBtn not found during initialization error handling.');
     }
    const widgetDiv = document.getElementById('google_translate_element');
     if(widgetDiv){
        widgetDiv.style.display = 'none';
        widgetDiv.setAttribute('aria-hidden', 'true');
        widgetDiv.classList.add('google-translate-hidden');
     } else {
         console.warn('Translate widget div #google_translate_element not found during initialization error handling.');
     }
    translateLoaded = false; // Ensure flag is false
  }
}

// Global flag to indicate if the Google Translate widget has successfully initialized its DOM
// let translateLoaded = false; // Moved to top
// Define the HTML content strings globally so they are accessible
// const hideHtml = '<span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span> अनुवाद छुपाएँ'; // Moved to top
// const showHtml = '<span class="emoji-pulse">😮</span>Experience the Granth in your mother tongue<span class="emoji-spin">🌍</span>'; // Moved to top
// const loadingHtml = 'अनुवाद लोड हो रहा है... <span class="emoji-sandclock">⌛</span>'; // Moved to top

/**
 * Handles the click event for the translate button.
 * Loads the Google Translate script if not already loaded,
 * or toggles the visibility/resets translation if loaded.
 * @param {Event} event - The click event object.
 */
function initTranslate(event) {
  const widget = document.getElementById('google_translate_element');
  const btn = event.currentTarget;
  // Define the 'hide' and 'show' HTML content for the button including emojis
  // const hideHtml = '<span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span> अनुवाद छुपाएँ'; // Moved to top
  // const showHtml = '<span class="emoji-pulse">😮</span>Experience the Granth in your mother tongue<span class="emoji-spin">🌍</span>'; // Moved to top
  // const loadingHtml = 'अनुवाद लोड हो रहा है... <span class="emoji-sandclock">⌛</span>'; // Moved to top


  if (!widget || !btn) {
      console.error('Translate button or widget element not found when clicked.');
      if (btn) btn.disabled = true; // Disable button if elements are missing
      return;
  }

   // Check if the button is currently disabled (likely in a processing/loading state)
   if (btn.disabled) {
      console.log('Translate button is disabled, ignoring click.');
      return;
   }
   // Also check if it's already showing the loading HTML (prevents double click issues if not yet disabled)
   if (btn.innerHTML.includes('<span class="emoji-sandclock">')) { // <--- CHECK FOR LOADING STATE BEFORE PROCESSING CLICK
       console.log('Translate button is already in loading state, ignoring click.');
       return;
   }


  // Determine current state based on widget visibility and button text
  // Use the CSS class as the primary state indicator, falling back to style.display
  const isWidgetHidden = widget.classList.contains('google-translate-hidden') || widget.style.display === 'none' || widget.style.display === '';
  // Use innerHTML to check for the specific content including emojis
  // const isButtonShowingHideText = btn.innerHTML.trim().includes('अनुवाद छुपाएँ'); // Not strictly needed if relying on widget state

  if (!translateLoaded) {
    // If widget is not loaded/initialized yet (translateLoaded is false)
    console.log('Google Translate widget not initialized. Loading script...');
    btn.disabled = true; // Disable button to prevent multiple clicks
    // Set button html to indicate loading (using the new loadingHtml)
    btn.innerHTML = loadingHtml; // <--- SET LOADING HTML
    btn.setAttribute('aria-expanded', 'false');
    // Ensure widget is hidden while script loads
    widget.style.display = 'none';
    widget.setAttribute('aria-hidden', 'true');
    widget.classList.add('google-translate-hidden'); // Ensure CSS hiding class is on


    let script = document.getElementById('google-translate-script');
    if (!script) {
        // Create and append the script if it doesn't exist
        script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        script.defer = true;
        script.id = 'google-translate-script';
        script.onerror = () => {
           console.error('Google Translate script failed to load.');
           btn.disabled = false; // Enable button
           // Restore original HTML content, or show an error state
            // On error, update the button HTML to show an error message
            btn.innerHTML = 'अनुवाद लोड नहीं हो सका <span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span>'; // <--- SET ERROR HTML
           widget.style.display = 'none';
           widget.setAttribute('aria-hidden', 'true');
           widget.classList.add('google-translate-hidden');
           translateLoaded = false; // Ensure flag is false
           btn.setAttribute('aria-expanded', 'false');
        };
        document.body.appendChild(script);
        console.log('Google Translate script tag appended to body.');
    } else {
         // If script tag exists but translateLoaded is still false, it means
         // the script was added but the callback hasn't fired yet.
         console.log('Google Translate script tag already exists. Waiting for googleTranslateElementInit callback...');
         // Keep the button disabled and text "Loading..." until the callback fires
         btn.disabled = true;
         btn.innerHTML = loadingHtml; // <--- Ensure it shows loading HTML
         btn.setAttribute('aria-expanded', 'false');
    }
  } else {
    // Translate widget is loaded.
    if (isWidgetHidden) { // Currently hidden, button click means Show widget
       console.log('Showing Google Translate widget...');
       widget.style.display = 'flex'; // Use flex for alignment (matches CSS)
       widget.classList.remove('google-translate-hidden'); // Remove the hiding class
       btn.innerHTML = hideHtml; // Change button to "hide" state
       btn.setAttribute('aria-expanded', 'true');
       widget.setAttribute('aria-hidden', 'false'); // Make visible for screen readers
       console.log('Google Translate widget shown.');
    } else { // Currently shown, button click means Hide widget & reload
       console.log('Hiding Google Translate widget and reloading page...');
       // First, hide the widget and update button state immediately for visual feedback
       widget.style.display = 'none';
       widget.classList.add('google-translate-hidden');
       btn.innerHTML = showHtml; // Change button back to "show" state
       btn.setAttribute('aria-expanded', 'false');
       widget.setAttribute('aria-hidden', 'true');

       // Google Translate heavily modifies the DOM. The cleanest way to remove
       // its effects and revert to the original language is to reload the page.
       window.location.reload();
       // Note: Code execution often stops or becomes unreliable after window.location.reload()
       // console.log('Page reloading...'); // This might not appear in console
    }
  }
}


/**
 * Finds all potentially focusable elements within a given container.
 * Includes elements that are naturally focusable or have tabindex >= 0.
 * Does NOT include elements with tabindex="-1" *unless* they also have data-original-tabindex.
 * @param {HTMLElement} container - The element to search within.
 * @returns {NodeList} - A NodeList of focusable elements.
 */
function getFocusableElements(container) {
    // Selects:
    // 1. Elements with an href attribute (a)
    // 2. Buttons, inputs, selects, textareas that are NOT disabled
    // 3. Elements with a tabindex value that is NOT -1
    // Includes elements that had data-original-tabindex, as they were focusable before we hid them.
    return container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [data-original-tabindex]'
    );
}

/**
 * Toggles the expanded/collapsed state of a chapter section.
 * Handles display, height animation, ARIA attributes, and focusability of content children.
 * @param {HTMLElement} chapterDiv - The .chapter element to toggle.
 */
function toggleChapter(chapterDiv) {
  const heading = chapterDiv.querySelector('h2');
  const content = chapterDiv.querySelector('.content');
  const isActive = chapterDiv.classList.contains('active');
  const allChapters = document.querySelectorAll('#chapters .chapter');

  if (!heading || !content) {
    console.error('toggleChapter called on element without h2 or .content child:', chapterDiv);
    return;
  }

  console.log(`Toggling chapter: "${heading.textContent.trim()}" (Current state: ${isActive ? 'Open' : 'Closed'})`);

  // If the current chapter is active, close it
  if (isActive) {
    // If focus is inside the content, move it to the heading before hiding
    if (document.activeElement && content.contains(document.activeElement)) {
      // Use a small timeout to allow potential Escape key handling logic to complete
      // before moving focus, reducing potential conflicts.
      setTimeout(() => {
           heading.focus({ preventScroll: true }); // Move focus without additional scrolling
           console.log('Focus moved from content to heading before collapsing.');
      }, 50); // Small delay

    }

    chapterDiv.classList.remove('active');
    heading.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true'); // Hide from screen readers when collapsed
    content.setAttribute('tabindex', '-1'); // Make content container itself unfocusable

     // Find all focusable elements within this chapter's content *before* changing tabindex
    const focusableElements = getFocusableElements(content);
    // Make focusable children unfocusable and store their original tabindex
    focusableElements.forEach(el => {
        // Only store if it's not already explicitly marked as -1
        if (el.getAttribute('tabindex') !== '-1') {
             // Store original tabindex (or null/empty string) using dataset
             // Ensure we don't overwrite data-original-tabindex if it was already set
             if (!el.dataset.originalTabindex) {
                 el.dataset.originalTabindex = el.getAttribute('tabindex') || ''; // Store null or '' as ''
             }
        }
        el.setAttribute('tabindex', '-1'); // Make it unfocusable
    });

    // Get the current computed height *before* setting maxHeight to 0,
    // but *after* ensuring display is block (if it wasn't already during animation)
    // content.style.display = 'block'; // Ensure it's block for measurement if animating from display: none (already handled by CSS initial state)
    content.style.maxHeight = content.scrollHeight + 'px'; // Set maxHeight to current height for transition starting point
    content.style.overflow = 'hidden'; // Keep hidden during transition
    content.style.opacity = '1'; // Start visible for fade-out

    // Use requestAnimationFrame before starting the transition to ensure the browser
    // has processed the style changes needed for the collapse animation.
    requestAnimationFrame(() => {
        // Now apply the collapse transition styles
        content.style.maxHeight = '0'; // Target collapsed height
        content.style.opacity = '0'; // Fade out
        content.style.paddingTop = '0'; // Animate padding collapse
        content.style.paddingBottom = '0'; // Animate padding collapse
    });


     // After transition completes (or immediately if no transition), hide completely and remove from tab flow
     // Listen for the end of the transition on the content element
     const handleTransitionEnd = () => {
         // Check if the chapter is still collapsed before setting display: none
         // This prevents incorrect state if the user quickly expands it again
         if (!chapterDiv.classList.contains('active')) {
            content.style.display = 'none'; // Hide completely
            // aria-hidden and tabindex -1 are already set above
             console.log('Chapter content fully hidden and inaccessible after transition.');
         }
         // Clean up the event listener
         content.removeEventListener('transitionend', handleTransitionEnd);
     };

     // Check if transitions are enabled and have duration > 0
     const transitionDuration = getComputedStyle(content).transitionDuration;
     const transitionExists = parseFloat(transitionDuration) > 0;

     if (transitionExists) {
          content.addEventListener('transitionend', handleTransitionEnd);
     } else {
         // No transition, apply final styles immediately
         handleTransitionEnd();
     }

    console.log('Chapter collapsed (starting transition).');
    return; // Exit after closing
  }

  // Close any other active chapter before opening the new one
  allChapters.forEach(otherChapter => {
    if (otherChapter !== chapterDiv && otherChapter.classList.contains('active')) {
      console.log('Closing other active chapter: "' + otherChapter.querySelector('h2')?.textContent.trim() + '"'); // Use optional chaining
      const otherHeading = otherChapter.querySelector('h2');
      const otherContent = otherChapter.querySelector('.content');
      if (otherHeading && otherContent) {
         // Get focusable elements in the other chapter's content
         const otherFocusableElements = getFocusableElements(otherContent);

        // If focus is inside the other chapter's content, move it to its heading
        if (document.activeElement && otherContent.contains(document.activeElement)) {
             setTimeout(() => { // Small delay for potential Escape key handling
                otherHeading.focus({ preventScroll: true });
                 console.log('Focus moved from content to heading of other closing chapter.');
             }, 50);
        }

        otherChapter.classList.remove('active');
        otherHeading.setAttribute('aria-expanded', 'false');
        otherContent.setAttribute('aria-hidden', 'true');
        otherContent.setAttribute('tabindex', '-1');

        // Make focusable children in the other chapter unfocusable
         otherFocusableElements.forEach(el => {
              if (el.getAttribute('tabindex') !== '-1') {
                 if (!el.dataset.originalTabindex) {
                    el.dataset.originalTabindex = el.getAttribute('tabindex') || '';
                 }
             }
             el.setAttribute('tabindex', '-1');
         });

         // Prepare for collapse transition (set initial height before setting to 0)
         otherContent.style.display = 'block';
         otherContent.style.maxHeight = otherContent.scrollHeight + 'px';
         otherContent.style.overflow = 'hidden';
         otherContent.style.opacity = '1';
         otherContent.style.paddingTop = ''; // Ensure padding is measured
         otherContent.style.paddingBottom = ''; // Ensure padding is measured

         // Use requestAnimationFrame before starting transition
         requestAnimationFrame(() => {
             // Start collapse transition for other content
            otherContent.style.maxHeight = '0';
            otherContent.style.opacity = '0';
             otherContent.style.paddingTop = '0';
             otherContent.style.paddingBottom = '0';
         });


        const otherHandleTransitionEnd = () => {
             if (!otherChapter.classList.contains('active')) {
                otherContent.style.display = 'none';
             }
             otherContent.removeEventListener('transitionend', otherHandleTransitionEnd);
         };

        const otherTransitionDuration = getComputedStyle(otherContent).transitionDuration;
        const otherTransitionExists = parseFloat(otherTransitionDuration) > 0;

        if (otherTransitionExists) {
            otherContent.addEventListener('transitionend', otherHandleTransitionEnd);
        } else {
            otherHandleTransitionEnd();
        }
      } else {
        console.warn('Could not find h2 or .content in other chapter for closing logic.');
      }
    }
  });

  // Open the clicked chapter
  chapterDiv.classList.add('active');
  heading.setAttribute('aria-expanded', 'true');
  content.setAttribute('aria-hidden', 'false'); // Make visible for screen readers
  content.setAttribute('tabindex', '0'); // Content region itself can be a tab stop when open


  // First set display to block and restore padding (without transition)
  content.style.display = 'block';
  content.style.maxHeight = '0'; // Start from 0 for the expand animation
  content.style.overflow = 'hidden'; // Still hidden during max-height transition
  content.style.opacity = '0'; // Start invisible for fade-in effect
  content.style.paddingTop = ''; // Restore original padding from CSS
  content.style.paddingBottom = ''; // Restore original padding from CSS


  // Use requestAnimationFrame to ensure DOM updates (display, padding) are applied
  // and the browser can correctly measure scrollHeight.
  requestAnimationFrame(() => {
      const naturalHeight = content.scrollHeight; // Measure natural height *with* padding

      // Apply max-height and opacity transition
      content.style.maxHeight = naturalHeight + 'px'; // Animate to natural height
      content.style.opacity = '1'; // Fade in


      // Restore focusability of children inside the opened content
       const focusableElements = getFocusableElements(content); // Get elements *after* setting display: block
       focusableElements.forEach(el => {
           // Check if we previously stored an original tabindex
           const originalTabindex = el.dataset.originalTabindex; // Use dataset API

           if (originalTabindex !== undefined) { // Check if the data attribute exists
               // Restore original tabindex (empty string becomes "0" or removes attribute depending on browser interpretation, standard is remove)
               // A common pattern is to set '0' if it was previously null/empty/not set explicitly,
               // unless it's a naturally focusable element. Let's restore to 0 if it was empty or explicitly 0.
               // For elements that are naturally focusable (like links, buttons etc.) and had no originalTabIndex,
               // we don't need to set tabindex="0".
               // const elementHadTabindexSet = el.hasAttribute('tabindex'); // Check if tabindex was explicitly set before we changed it

               if (originalTabindex === '' || originalTabindex === '0') {
                    el.setAttribute('tabindex', '0'); // Explicitly set to 0 if it was empty string or 0
               } else {
                   el.setAttribute('tabindex', originalTabindex); // Restore the specific value
               }

               // Clean up the data attribute
               delete el.dataset.originalTabindex; // Use dataset delete
           } else {
                // This element was likely not focusable when collapsed (maybe hidden or just not in the query initially).
                // If it's a naturally focusable element now that it's visible, it will be focusable.
                // If it's not naturally focusable but *should* be (e.g., a div acting as a custom control),
                // you would need a different way to identify it. The getFocusableElements query covers most cases.
                // No action needed here unless we want to *ensure* tabindex="0" for certain non-naturally focusable types.
           }
       });


      // Remove max-height after transition to allow content to expand/shrink fluidly on resize
       const handleOpenTransitionEnd = () => {
            // Check if the chapter is still active before removing max-height
            if (chapterDiv.classList.contains('active')) {
               content.style.maxHeight = 'none'; // Allow natural height changes on resize
                content.style.overflow = ''; // Restore default overflow (allow content like tables to overflow if needed)
                console.log('Chapter max-height removed after transition.');
            }
           // Clean up the event listener
           content.removeEventListener('transitionend', handleOpenTransitionEnd);
       };

       const transitionDuration = getComputedStyle(content).transitionDuration;
       const transitionExists = parseFloat(transitionDuration) > 0;

       if (transitionExists) {
            content.addEventListener('transitionend', handleOpenTransitionEnd);
       } else {
           // No transition, apply final styles immediately
           handleOpenTransitionEnd();
       }

      console.log('Chapter expanded (starting transition).');

      // Scroll the heading into view AFTER the state change and initial layout
      // Use a slight delay to ensure scroll happens *after* display changes and transition starts
      setTimeout(() => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Set focus to the heading of the expanded chapter for better UX
        // Needs a slight *additional* delay for scroll and animation to settle
         setTimeout(() => {
            // Check if still active, as user might click away quickly
            if (chapterDiv.classList.contains('active')) {
                 heading.focus({ preventScroll: true }); // Ensure heading gets focus, prevent scrolling again
                console.log('Focus set to expanded chapter heading.');
            }
        }, 300); // Increased delay for smoother experience after scroll

      }, 50); // Initial delay before scrolling
  });
}

/**
 * Scrolls to the chapters section and starts the background music.
 */
function goToChaptersAndPlay() {
    console.log('Start Journey button clicked. Scrolling to chapters and attempting to play music...');
    const chaptersHeading = document.getElementById('chapters-heading');
    const sitarAudio = document.getElementById('sitarAudio');
    const startButton = document.getElementById('startJourneyBtn');
    const stopButton = document.getElementById('stopMusicBtn');

    if (chaptersHeading) {
        // Scroll smoothly to the beginning of the chapters section heading
        chaptersHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('Scrolled to chapters section.');
    } else {
        console.warn('Chapters heading element #chapters-heading not found for scrolling.');
    }

    if (sitarAudio) {
        // Check if audio is already playing (optional, prevents restart on repeated clicks)
        // Using `sitarAudio.paused` is generally reliable
        if (sitarAudio.paused) {
             sitarAudio.play()
                 .then(() => {
                     console.log('Background music started.');
                     // Show the stop button and hide/disable the start button
                     if (stopButton) {
                         stopButton.style.display = 'inline-flex'; // Use flex/inline-flex to match button-group CSS
                         stopButton.setAttribute('aria-hidden', 'false');
                     }
                      if (startButton) {
                         startButton.style.display = 'none';
                         // REMOVED: startButton.setAttribute('aria-hidden', 'true'); // Redundant with display: none
                      }
                      // Move focus away from the clicked button to prevent the aria-hidden warning
                      startButton.blur();
                 })
                 .catch(error => {
                     console.error('Failed to play background music. User interaction required or browser blocked autoplay:', error);
                     // Keep buttons in original state if play failed
                     if (stopButton) { stopButton.style.display = 'none'; stopButton.setAttribute('aria-hidden', 'true'); }
                     if (startButton) {
                         startButton.style.display = 'inline-flex';
                         startButton.setAttribute('aria-hidden', 'false'); // Ensure it's not hidden
                     }
                 });
        } else {
             console.log('Background music is already playing.');
             // Ensure buttons are in correct state if music is already playing
             if (stopButton) { stopButton.style.display = 'inline-flex'; stopButton.setAttribute('aria-hidden', 'false'); }
             if (startButton) {
                startButton.style.display = 'none';
                 // REMOVED: startButton.setAttribute('aria-hidden', 'true'); // Redundant with display: none
                startButton.blur(); // Ensure focus is removed even if already hidden
             }
        }
    } else {
        console.warn('Audio element #sitarAudio not found.');
        // If audio element is missing, ensure stop button stays hidden
         if (stopButton) { stopButton.style.display = 'none'; stopButton.setAttribute('aria-hidden', 'true'); }
         if (startButton) {
            startButton.style.display = 'inline-flex';
            startButton.setAttribute('aria-hidden', 'false'); // Ensure it's not hidden
         }
    }
}

/**
 * Stops the background music and hides the stop button.
 */
function stopMusic() {
     console.log('Stop Music button clicked. Attempting to stop music...');
     const sitarAudio = document.getElementById('sitarAudio');
     const startButton = document.getElementById('startJourneyBtn');
     const stopButton = document.getElementById('stopMusicBtn');

     if (sitarAudio) {
         if (!sitarAudio.paused) {
             sitarAudio.pause();
             sitarAudio.currentTime = 0; // Rewind to start
             console.log('Background music stopped.');
         } else {
             console.log('Music is already stopped.');
         }
         // Hide the stop button and show/enable the start button regardless of paused state (synchronize UI)
          if (stopButton) {
              stopButton.style.display = 'none';
              // REMOVED: stopButton.setAttribute('aria-hidden', 'true'); // Redundant with display: none
              stopButton.blur(); // Move focus away from the clicked button
          }
           if (startButton) {
               startButton.style.display = 'inline-flex'; // Use flex/inline-flex
               startButton.setAttribute('aria-hidden', 'false'); // Ensure it's NOT hidden for SRs when visible
           }
     } else {
        console.warn('Audio element #sitarAudio not found.');
        // Ensure buttons are in correct state if audio element is missing
        if (stopButton) {
            stopButton.style.display = 'none';
            stopButton.setAttribute('aria-hidden', 'true');
            stopButton.blur();
        }
        if (startButton) {
           startButton.style.display = 'inline-flex';
           startButton.setAttribute('aria-hidden', 'false');
        }
     }
}


// Add keyboard navigation handlers (Enter/Space for toggle, Escape for close)
document.addEventListener('keydown', function(event) {
  const target = event.target;

  // Toggle chapter with Enter or Space if focused on an H2 with role="button"
  if (target && target.tagName === 'H2' && target.getAttribute('role') === 'button' && target.closest('.chapter')) {
    // Ensure the event target is the H2 button itself
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent default space scroll or enter form submission
      const chapter = target.closest('.chapter'); // Get the parent chapter element
      if (chapter) {
          toggleChapter(chapter);
      } else {
          console.warn('Keydown on H2 button, but parent .chapter not found.', target);
      }
    }
  }

  // Escape key to close an open chapter if focus is inside its content area
  if (event.key === 'Escape') {
    const focusedElement = document.activeElement;
    // Check if focused element or its parent is within an active chapter's content (.content)
    const contentArea = focusedElement ? focusedElement.closest('.chapter.active .content') : null;

    if (contentArea) {
      const chapter = contentArea.closest('.chapter.active');
      if (chapter) {
        event.preventDefault(); // Prevent other escape key behaviors (like closing modals if any)
        // toggleChapter handles moving focus to the heading before hiding, which is correct behavior for Escape.
        toggleChapter(chapter);
        console.log('Escape key pressed inside active chapter content. Closing chapter.');
      }
    }
  }
});

// Distinguish mouse and keyboard focus for :focus-visible
// This prevents the :focus-visible outline appearing when clicking
let lastInputWasKeyboard = false;
document.body.addEventListener('mousedown', function() {
    lastInputWasKeyboard = false;
}, { capture: true }); // Use capture phase

document.body.addEventListener('keydown', function(event) {
    // Filter out just modifier keys like Ctrl, Shift, Alt, Meta unless they are part of Tab/Enter/Space
    // Also include arrow keys, Home, End, PageUp, PageDown as keyboard navigation
    const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
    const isCommonInteractionKey = ['Tab', 'Enter', ' '].includes(event.key);
    const isNavigationKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key);

    if ((!isModifierKey || isCommonInteractionKey) || isNavigationKey) {
         lastInputWasKeyboard = true;
    } else {
         // If it's a modifier key pressed alone, or some other non-nav key,
         // we don't necessarily want to reset the mode, but let's assume any *meaningful* keypress indicates keyboard use.
         // The check above seems sufficient.
    }
}, { capture: true }); // Use capture phase

// Use capture phase to add/remove class before the focus event fires on the element
document.body.addEventListener('focusin', function(event) {
     // If the focus target is not the body itself and the last input was keyboard,
     // remove the 'using-mouse' class to allow focus-visible outline.
     // If the last input was mouse, add the 'using-mouse' class.
     if (event.target !== document.body) { // Ignore focusin on body itself
          if (lastInputWasKeyboard) {
             document.body.classList.remove('using-mouse');
          } else {
              document.body.classList.add('using-mouse');
          }
     }
}, { capture: true });

// Use capture phase
document.body.addEventListener('focusout', function(event) {
    // A small delay to ensure the next focusin event determines the mode correctly
    // This is particularly useful when focus moves rapidly between elements.
    setTimeout(() => {
         // If document.activeElement is null, focus has left the document
         // If document.activeElement is document.body, focus might be "nowhere" specific
         // If focus is moving *to* an element outside the body via mouse, keep the class
         if (!document.activeElement || document.activeElement === document.body) {
              document.body.classList.remove('using-mouse');
         }
         // If focus moved via keyboard, focusin would have removed the class already.
         // If focus moved via mouse, focusin would have added the class.
         // So, we mostly just need to handle the case where focus leaves the document entirely.
    }, 10); // Small delay
}, { capture: true });


document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded. Performing initial setup and validation.');

  const stopBtn = document.getElementById('stopMusicBtn');
  const translateBtn = document.getElementById('translateBtn');
  const translateWidgetDiv = document.getElementById('google_translate_element');

  // --- Initial Button and Widget State ---
  // Ensure buttons and widget start in their correct visual and accessibility states
  if (stopBtn) {
    stopBtn.style.display = 'none'; // Ensure CSS also starts it hidden
    stopBtn.setAttribute('aria-hidden', 'true'); // Ensure it's hidden initially for SR
    console.log('Stop music button initialized to hidden state.');
  } else {
      console.warn('Stop music button with id "stopMusicBtn" not found.');
  }

  if (translateBtn) {
     translateBtn.setAttribute('aria-controls', 'google_translate_element');
     translateBtn.setAttribute('aria-expanded', 'false'); // Default state is collapsed/hidden
     // Set the initial button HTML explicitly using the showHtml variable
     // Check if it's not already in the hide state (prevents overwriting if page loads mid-translation)
      if (!translateBtn.innerHTML.includes('अनुवाद छुपाएँ')) { // <--- Check if it's NOT already hide state
          translateBtn.innerHTML = showHtml; // <--- Ensure initial state is correct HTML
           console.log('Translate button initial HTML set to show state by JS.');
      } else {
          console.log('Translate button initial HTML already looks like hide state (possibly translated on previous load).');
      }
      // Initially enable the button, it will be disabled by initTranslate if script loading starts
      translateBtn.disabled = false;

  } else {
       console.warn('Translate button with id "translateBtn" not found.');
  }

    if(translateWidgetDiv){
         translateWidgetDiv.style.display = 'none'; // Ensure CSS also starts it hidden
         translateWidgetDiv.setAttribute('aria-hidden', 'true'); // Hide by default for SR
         // Add a class that CSS can use to specifically target and hide the container
         // This class will be removed when the widget is shown
         translateWidgetDiv.classList.add('google-translate-hidden');
         console.log('Translate widget div initialized to hidden state with class.');
    } else {
         console.warn('Translate widget div with id "google_translate_element" not found.');
         // If the widget div is missing, disable the translate button
         if(translateBtn) {
             translateBtn.disabled = true;
             btn.innerHTML = 'अनुवाद div नहीं मिला <span class="emoji-spin">🌍</span> <span class="emoji-pulse">❌</span>'; // <--- Update error text on missing div
              translateBtn.setAttribute('aria-expanded', 'false');
             console.error('Translate button disabled because widget div is missing.');
         }
    }


  // Setup ARIA attributes for chapters and manage initial display/maxHeight/focusable elements
  document.querySelectorAll('#chapters .chapter').forEach((chapter, index) => {
    const heading = chapter.querySelector('h2');
    const content = chapter.querySelector('.content');

    if (heading && content) {
        // Ensure IDs exist for ARIA linking
        // Use a more robust ID generation based on index if text content is unreliable
        if (!heading.id) {
            const chapterNumberMatch = heading.textContent.trim().match(/^(\d+)/);
            // Use index as a fallback if number cannot be extracted, add a random string for uniqueness probability
             const baseId = `chapter-${chapterNumberMatch ? chapterNumberMatch[1] : (index + 1)}-${Math.random().toString(36).substr(2, 4)}`;
             heading.id = `heading-${baseId}`;
            // console.log(`Generated ID for heading: ${heading.id}`);
        }
        if (!content.id) {
             content.id = `content-${heading.id.replace('heading-', '')}`; // Link ID based on heading ID
             // console.log(`Generated ID for content: ${content.id}`);
        }

      heading.setAttribute('role', 'button'); // Make it behave like a button for SRs
      heading.setAttribute('tabindex', '0');    // Make it focusable via keyboard
      heading.setAttribute('aria-controls', content.id); // Links heading to content panel
      heading.setAttribute('aria-expanded', 'false'); // Initial state is collapsed

      content.setAttribute('role', 'region'); // Content is a region
      content.setAttribute('aria-labelledby', heading.id); // Links content panel to its heading
      content.setAttribute('aria-hidden', 'true'); // Hide from screen readers initially
      content.setAttribute('tabindex', '-1'); // Make content container itself unfocusable when closed


      // Apply initial closed state styles via JavaScript for controlled transitions
      // These styles will be overridden by the 'active' class and JS logic in toggleChapter
      content.style.display = 'none'; // Start hidden
      content.style.maxHeight = '0'; // Start collapsed height
      content.style.overflow = 'hidden'; // Hide overflow
      content.style.opacity = '0'; // Start invisible
      content.style.paddingTop = '0'; // Start with zero padding
      content.style.paddingBottom = '0'; // Start with zero padding

       // Find focusable elements within content and initially make them unfocusable
       const focusableElements = getFocusableElements(content);
       focusableElements.forEach(el => {
           // Store original tabindex (if any) before setting to -1
            // Ensure we don't overwrite if this element was already processed (shouldn't happen in DOMContentLoaded loop, but good practice)
            if (!el.dataset.originalTabindex) {
                 // Only store if it's not already explicitly -1
                 if (el.getAttribute('tabindex') !== '-1') {
                     el.dataset.originalTabindex = el.getAttribute('tabindex') || ''; // Store null/empty as empty string
                 }
            }
           el.setAttribute('tabindex', '-1'); // Make it unfocusable when collapsed
       });

        console.log(`Chapter "${heading.textContent.trim()}" setup complete.`);


    } else {
      console.warn('Skipping ARIA setup for incomplete chapter structure. Ensure each .chapter has an h2 and .content child:', chapter);
    }
  });

  // --- Service Worker Registration ---
  // Only register the Service Worker if the protocol is suitable (http or https)
  // Check moved here to be part of DOMContentLoaded setup
    /**
     * Helper function to check if the current protocol is suitable for Service Workers
     * @returns {boolean} True if protocol is http or https.
     */
    function isServiceWorkerSupportedProtocol() {
        return window.location.protocol === 'http:' || window.location.protocol === 'https:';
    }

  if (isServiceWorkerSupportedProtocol() && 'serviceWorker' in navigator) {
       console.log('Attempting Service Worker registration...');
       // Use the 'load' event to ensure the page is fully loaded before registering.
       // This reduces the chance of the SW interfering with critical initial fetches.
       window.addEventListener('load', () => {
        navigator.serviceWorker.register('/VishwadharmGranth/sw.js') // Register sw.js from the project subdirectory
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
            // Optional: Listen for updates if you implement cache-updating strategies
             /*
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New content is available!');
                    // Optional: Show a UI prompt to the user to refresh
                  }
                });
              }
            });
            */
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    } else if (!isServiceWorkerSupportedProtocol()) {
       console.warn(`Service Worker registration skipped: Service Workers are not supported on the current protocol (${window.location.protocol}). Use http:// or https://.`);
    } else {
       console.warn('Service Worker registration skipped: Service Workers are not supported in this browser.');
    }

  // Run validation after initial DOM manipulations
  validateDocument();
  console.log('Initial DOM setup, ARIA, keyboard handlers, and asset checks complete.');
});


/**
 * Validates basic HTML structure and accessibility features.
 * Logs warnings/errors to the console.
 */
function validateDocument() {
    console.log('Running basic HTML and Accessibility validation check...');

    // Fix: Corrected access to document.doctype.name
    if (document.doctype === null || document.doctype.name.toLowerCase() !== 'html') {
      console.error('Validation Error: Missing or incorrect DOCTYPE. Must be <!DOCTYPE html> as the very first line.');
    } else {
        console.log('Validation Check: DOCTYPE is correct.');
    }

    const htmlElement = document.documentElement;
    // Only warn about lang if not translated by Google Translate, as it changes the lang attribute.
    // Google Translate adds classes like 'translated-ltr' or 'translated-rtl' to the html tag.
    const isTranslated = htmlElement.classList.contains('translated-ltr') || htmlElement.classList.contains('translated-rtl');
    if (!htmlElement.lang || htmlElement.lang.trim() === '' || (!isTranslated && htmlElement.lang.toLowerCase() !== 'hi') ) {
        // Refined warning based on translation state
      console.warn(`Accessibility Warning: <html> element is missing the "lang" attribute, is empty, or might not accurately reflect the initial content language ('hi'). Current lang: "${htmlElement.lang}" (Translated by Google: ${isTranslated})`);
    } else {
         console.log('Validation Check: <html> lang attribute is present and appears correct (or is translated).');
    }


    if (!document.title || document.title.trim() === '') {
      console.warn('Accessibility Warning: Document title (<title>) is missing or empty. The title is crucial for browser tabs, bookmarks, and screen readers.');
    } else if (document.title.trim().length < 15) { // Slightly increased length threshold for suggestion
       console.warn(`Suggestion: Document title is quite short ("${document.title.trim()}"). Consider making it more descriptive.`);
    } else {
         console.log('Validation Check: Document title is present and reasonably descriptive.');
    }

    const mainElement = document.querySelector('main');
    if (!mainElement) {
      console.warn('HTML Structure Warning: Missing <main> element. The primary content should be enclosed in a <main> tag.');
    } else {
       // Check if main contains substantial content
       const hasSignificantContent = mainElement.children.length > 1 || mainElement.textContent.trim().length > 100; // More children or more text
        if (!hasSignificantContent) {
            console.warn('HTML Structure Warning: <main> element appears functionally empty or contains minimal content.');
        } else {
             console.log('Validation Check: <main> element is present and contains content.');
        }
    }

    document.querySelectorAll('section').forEach((section, index) => {
       const sectionHeading = section.querySelector('h1, h2, h3, h4, h5, h6');
       const hasAriaLabel = section.hasAttribute('aria-label') || section.hasAttribute('aria-labelledby');
       // Warn if a section acting as a landmark (region role) or containing significant content lacks a label/heading
        // Check if it's likely a meaningful section (has children, not just whitespace)
        const isMeaningfulSection = Array.from(section.childNodes).some(node =>
            node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0)
        );
        if ( isMeaningfulSection && (section.getAttribute('role') === 'region' || section.children.length > 0) && !sectionHeading && !hasAriaLabel) {
           console.warn(`Accessibility Suggestion: Section (ID: ${section.id || 'N/A'}, Index: ${index + 1}) seems to contain content but lacks a semantic heading (h1-h6) or ARIA label/labelledby. This makes navigation difficult for screen reader users.`);
       } else {
           // console.log(`Validation Check: Section ${section.id || 'N/A'} has heading/label or is empty/decorative.`); // Too noisy
       }
    });

     document.querySelectorAll('img').forEach(img => {
         const imgSrc = img.getAttribute('src');
         const imgAlt = img.getAttribute('alt');
         // Re-checked project-specific validation based on expected cached assets (moved to SW)
         // Allowed assets check removed from JS validation as it's more SW concern.
         // Validation now focuses purely on accessibility (alt text).
         if (imgAlt === null) {
             console.warn(`Accessibility Warning: Image with src "${imgSrc || 'unknown'}" is missing the 'alt' attribute entirely.`);
         } else if (imgAlt.trim().length === 0 && img.getAttribute('role') !== 'presentation') {
             console.warn(`Accessibility Warning: Image with src "${imgSrc || 'unknown'}" has an empty 'alt' attribute but is not marked with role="presentation". Provide descriptive alt text or use role="presentation" if purely decorative.`);
         } else if (imgAlt.trim().length > 0 && imgAlt.trim().length < 5 && img.getAttribute('role') !== 'presentation' && imgSrc && !imgSrc.toLowerCase().endsWith('.svg') && !imgSrc.toLowerCase().includes('icon') && !imgAlt.toLowerCase().includes('icon')) {
              // Refined suggestion to exclude very short alt text for likely icons/small graphics unless they have role="presentation"
              console.warn(`Accessibility Suggestion: Alt text for image "${imgSrc || 'unknown'}" ("${imgAlt.trim()}") is very short. Ensure it is sufficiently descriptive if the image conveys information, or mark with role="presentation" if decorative.`);
         } else {
              // console.log(`Validation Check: Image with src "${imgSrc || 'unknown'}" has sufficient alt text or role="presentation".`); // Too noisy
         }
     });

    document.querySelectorAll('audio').forEach((audio, index) => {
        const hasAriaDescription = audio.hasAttribute('aria-describedby');
         // Check visibility loosely based on size and position, audio elements might be tiny
         // Also check for the 'controls' attribute which makes it visible/interactive
         const isRenderedAndInteractive = audio.offsetWidth > 0 || audio.offsetHeight > 0 || audio.getClientRects().length > 0 || audio.hasAttribute('controls');
         if (!hasAriaDescription && isRenderedAndInteractive) {
            console.warn(`Accessibility Warning: Visible or interactive audio element #${index + 1} (ID: ${audio.id || 'N/A'}) is missing 'aria-describedby' attribute linking to a description for non-obvious audio content (like background music).`);
         } else if (hasAriaDescription) {
            const descId = audio.getAttribute('aria-describedby');
             if (!document.getElementById(descId)) {
                console.warn(`Accessibility Warning: The element referenced by aria-describedby="${descId}" for audio element #${index + 1} (ID: ${audio.id || 'N/A'}) was not found.`);
             } else {
                 // console.log(`Validation Check: Audio element #${index + 1} has aria-describedby pointing to existing element.`); // Too noisy
             }
         } else {
             // console.log(`Validation Check: Hidden/non-interactive audio element #${index + 1} (ID: ${audio.id || 'N/A'}) validation skipped (no controls or aria-describedby needed if not user-facing).`); // Too noisy
         }
        // Project-specific asset validation for audio moved to SW install check list.
    });

    document.querySelectorAll('table').forEach((table, index) => {
        const hasCaption = table.querySelector('caption');
        if (!hasCaption) {
             console.warn(`Accessibility Warning: Table #${index + 1} (ID: ${table.id || 'N/A'}) is missing a <caption> element. Captions provide a programmatic title and summary for tables.`);
        } else {
             // console.log(`Validation Check: Table #${index + 1} has a caption.`); // Too noisy
        }

        // More thorough check for table headers
        const headers = table.querySelectorAll('th');
        if (headers.length > 0) {
            headers.forEach(th => {
                 // Check scope only if th contains visible content or is explicitly focusable/labeled
                 const hasContent = th.textContent.trim().length > 0 || th.querySelector('img, span, div') || th.hasAttribute('aria-labelledby') || th.hasAttribute('aria-label');
                 if (hasContent && !th.hasAttribute('scope')) {
                    console.warn(`Accessibility Suggestion: Add 'scope="col"' or 'scope="row"' to <th> element ("${th.textContent.trim() || th.id || 'N/A'}") in Table #${index + 1} (ID: ${table.id || 'N/A'}) for explicit header-to-cell association.`);
                 }
            });
        } else { // If no th elements found at all
             // Only warn if the table actually contains td cells
            if (table.querySelectorAll('td').length > 0) {
                 console.warn(`Accessibility Warning: Table #${index + 1} (ID: ${table.id || 'N/A'}) appears to be missing <th> (table header) elements but contains <td>. If this table has header cells, use <th> and 'scope'. If purely presentational, consider adding role="presentation" on the table.`);
            } else {
                 // console.log(`Validation Check: Table #${index + 1} has no th and no td, seems empty.`); // Too noisy
            }
        }
         // Check data-label existence if th is missing (implies CSS might be using this for mobile view)
         // This is a design/CSS pattern, not a strict validation error, so maybe keep as suggestion.
         // Let's check if it's a mobile view scenario (might need CSS media query check here, or just a general suggestion)
         // Given the CSS uses data-label for small screens, this check is relevant.
         // Check if table is potentially visible (not display: none)
         if(headers.length === 0 && table.querySelectorAll('td[data-label]').length === 0 && table.offsetParent !== null) { // Only warn if table is visible
             // No TH and no TD with data-label - mobile table readability might be poor
             // This is a suggestion for mobile accessibility/usability via CSS pattern.
              console.warn(`Accessibility Suggestion: Table #${index + 1} (ID: ${table.id || 'N/A'}) has no <th> headers and no 'data-label' attributes on <td>. This pattern is often used to improve table data readability on mobile via CSS.`);
         }
    });

    document.querySelectorAll('ul, ol').forEach((list, index) => {
        // Allow li, script, template, style within ul/ol, but warn about others
        const allowedTags = ['LI', 'SCRIPT', 'TEMPLATE', 'STYLE'];
        // Find the first child that is NOT allowed and is NOT just whitespace/comment
        const problematicChild = Array.from(list.children).find(child =>
            child.nodeType === Node.ELEMENT_NODE && // Only check element nodes
            !allowedTags.includes(child.tagName)
        );
        if (problematicChild) {
             console.warn(`HTML Structure Warning: List #${index + 1} (<${list.tagName.toLowerCase()}>, ID: ${list.id || 'N/A'}) contains a direct child element with tag "${problematicChild.tagName}" which is not <li> or a standard allowed element (script, template, style). This violates list semantics.`);
        } else {
             // console.log(`Validation Check: List #${index + 1} has valid direct children.`); // Too noisy
        }
    });
     console.log('Basic HTML and Accessibility validation check complete.');
  }