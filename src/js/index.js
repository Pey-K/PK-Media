import { initializeInfoIcons } from './utils.js';

export function initializeStaggeredAnimations() {
    const cards = document.querySelectorAll('.index-card');
    
    cards.forEach(card => {
        const staggeredContainer = card.querySelector('.staggered');
        if (!staggeredContainer) return;
        
        const children = staggeredContainer.querySelectorAll('.stat-item');
        const childCount = children.length;
        
        // Calculate title movement based on number of detail lines
        // More lines = title needs to move up more to make room
        // With larger stat numbers (1.6em), need more space - base: -180% for 2 lines
        const baseMove = -180;
        const additionalPerLine = 40;
        const titleMoveUp = baseMove - (Math.max(0, childCount - 2) * additionalPerLine);
        
        // Set title movement for this specific card
        const title = card.querySelector('h3');
        if (title) {
            title.style.setProperty('--title-move-up', `${titleMoveUp}%`);
            
            // Calculate actual text width of the title for separator width
            const calculateTitleWidth = () => {
                // Create a temporary span with the same text and styles
                const tempSpan = document.createElement('span');
                tempSpan.textContent = title.textContent;
                tempSpan.style.visibility = 'hidden';
                tempSpan.style.position = 'absolute';
                tempSpan.style.whiteSpace = 'nowrap';
                
                // Copy computed styles from the title
                const titleStyles = window.getComputedStyle(title);
                tempSpan.style.fontSize = titleStyles.fontSize;
                tempSpan.style.fontWeight = titleStyles.fontWeight;
                tempSpan.style.fontFamily = titleStyles.fontFamily;
                tempSpan.style.letterSpacing = titleStyles.letterSpacing;
                
                document.body.appendChild(tempSpan);
                const textWidth = tempSpan.offsetWidth;
                document.body.removeChild(tempSpan);
                
                // Set separator width to match title text width
                if (staggeredContainer) {
                    staggeredContainer.style.setProperty('--separator-width', `${textWidth}px`);
                }
            };
            
            // Calculate width after fonts load and on resize
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    setTimeout(calculateTitleWidth, 50);
                });
            } else {
                setTimeout(calculateTitleWidth, 100);
            }
            
            window.addEventListener('resize', calculateTitleWidth);
        }
        
        // Calculate separator position based on title movement and number of lines
        // Movies (2 lines): title moves up less, separator needs to be closer to title (more negative)
        // TV Shows/Music (4 lines): title moves up more, separator can be further from title (less negative)
        let separatorTop;
        if (childCount === 2) {
            // Movies: title moves up -180%, separator should be positioned just below the moved title
            // Less negative to position it below the title, not inside it
            separatorTop = -0.3;
        } else {
            // TV Shows/Music: title moves up -260%, more space available
            // Position separator lower (less negative) to move it below the title, not inside it
            const baseSeparatorTop = -0.75;
            const separatorAdjustment = (Math.max(0, childCount - 2) * 0.3);
            separatorTop = baseSeparatorTop + separatorAdjustment + 1; // Add 0.25 to move it further down
        }
        
        // Set separator position for this specific card
        // Use unitless number so CSS can multiply it by clamp() properly
        if (staggeredContainer) {
            const separatorTopValue = separatorTop.toString();
            staggeredContainer.style.setProperty('--separator-top', separatorTopValue);
            
            // Set spacing value (absolute value of separator-top) so CSS can use same formula
            // This ensures spacing below matches spacing above exactly
            const spacingValue = Math.abs(separatorTop);
            staggeredContainer.style.setProperty('--separator-spacing', spacingValue.toString());
            
            // For TV Shows and Music, add extra spacing below separator to match Movies
            if (childCount > 2) {
                staggeredContainer.style.setProperty('--extra-spacing', '0.5');
            } else {
                staggeredContainer.style.setProperty('--extra-spacing', '0');
            }
        }
        
        children.forEach((child, index) => {
            // Set CSS custom property for this child's delay
            // CSS will use: calc(var(--stagger-delay) * var(--stagger-index))
            child.style.setProperty('--stagger-index', index + 1);
        });
    });
}

// Make it available globally for populate.js
window.initializeStaggeredAnimations = initializeStaggeredAnimations;

// Initialize info icons on index page
document.addEventListener('DOMContentLoaded', () => {
    initializeInfoIcons();
    initializeStaggeredAnimations();
    // Cards are now proper links, so they'll navigate naturally
});

