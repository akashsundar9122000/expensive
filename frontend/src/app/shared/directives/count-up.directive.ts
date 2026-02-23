import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appCountUp]',
    standalone: true
})
export class CountUpDirective implements OnInit {
    @Input('appCountUp') endValue: number = 0;
    @Input() duration: number = 1500; // ms

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    ngOnInit() {
        this.animateCount();
    }

    private animateCount() {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / this.duration, 1);
            const currentValue = Math.floor(progress * this.endValue);

            this.renderer.setProperty(
                this.el.nativeElement,
                'innerText',
                new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0
                }).format(currentValue)
            );

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                // Final value with precision if needed, but for dashboard summary cards we use 0 digits usually
                this.renderer.setProperty(
                    this.el.nativeElement,
                    'innerText',
                    new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                    }).format(this.endValue)
                );
            }
        };
        window.requestAnimationFrame(step);
    }
}
