import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('statistic', {
      id: '1',
      title: 'Total Tasks',
      icon: 'assignment',
      value: 10,
      change: '+2',
      changeLabel: 'this week',
      changeType: 'positive',
      color: '#1976D2',
    });
    await fixture.whenStable();
  });

  it('renders statistic value and title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Total Tasks');
    expect(el.textContent).toContain('10');
  });
});
