import React, { useState } from 'react';
import { useTheme } from '../../lib/theme';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { TextField } from '../../components/ui/TextField';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { Select } from '../../components/ui/Select';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Dialog } from '../../components/ui/Dialog';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Toast } from '../../components/ui/Toast';
import { Chip } from '../../components/ui/Chip';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Ring } from '../../components/ui/Ring';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Banner } from '../../components/ui/Banner';
import { LineChart } from '../../components/ui/LineChart';
import { BarChart } from '../../components/ui/BarChart';
import { MacroBar } from '../../components/ui/MacroBar';
import { StatTile } from '../../components/ui/StatTile';
import { ListRow } from '../../components/ui/ListRow';
import { Sun, Moon, Laptop, Dumbbell, Sparkles, Plus, Bell, ChevronRight } from 'lucide-react';

export const DevUiPage: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Component test states
  const [stepperVal, setStepperVal] = useState(80);
  const [selectVal, setSelectVal] = useState('muscle_gain');
  const [segmentVal, setSegmentVal] = useState('plan');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);

  // Mock chart data
  const lineData = [
    { date: 'Mon', weight: 81.5 },
    { date: 'Tue', weight: 81.2 },
    { date: 'Wed', weight: 81.0 },
    { date: 'Thu', weight: 80.8 },
    { date: 'Fri', weight: 80.9 },
    { date: 'Sat', weight: 80.6 },
    { date: 'Sun', weight: 80.5 },
  ];

  const barData = [
    { day: 'Mon', calories: 2400 },
    { day: 'Tue', calories: 2550 },
    { day: 'Wed', calories: 2480 },
    { day: 'Thu', calories: 2620 },
    { day: 'Fri', calories: 2390 },
    { day: 'Sat', calories: 2500 },
    { day: 'Sun', calories: 2450 },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header with Live Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <PageHeader
            title="Design System Showcase"
            subtitle={`FitMind AI tokens and components (Active: ${theme}, Resolved: ${resolvedTheme})`}
          />
        </div>

        <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-xl border border-border self-start sm:self-auto">
          <Button
            size="sm"
            variant={theme === 'light' ? 'primary' : 'ghost'}
            icon={<Sun className="h-4 w-4" />}
            onClick={() => setTheme('light')}
          >
            Light
          </Button>
          <Button
            size="sm"
            variant={theme === 'dark' ? 'primary' : 'ghost'}
            icon={<Moon className="h-4 w-4" />}
            onClick={() => setTheme('dark')}
          >
            Dark
          </Button>
          <Button
            size="sm"
            variant={theme === 'system' ? 'primary' : 'ghost'}
            icon={<Laptop className="h-4 w-4" />}
            onClick={() => setTheme('system')}
          >
            System
          </Button>
        </div>
      </div>

      {/* 1. Design Tokens: Colors & Surfaces */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">1. Tokens: Surfaces & Accents</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-border bg-bg text-center">
            <span className="text-xs font-medium text-text-2">bg</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface text-center shadow-sm">
            <span className="text-xs font-medium text-text">surface</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface-2 text-center">
            <span className="text-xs font-medium text-text">surface-2</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-accent text-accent-contrast text-center font-medium">
            <span className="text-xs">accent</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-accent-soft text-accent-soft-text text-center font-medium">
            <span className="text-xs">accent-soft</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-warning text-white text-center font-medium">
            <span className="text-xs">warning</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-danger text-white text-center font-medium">
            <span className="text-xs">danger</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-macro-protein text-white text-center font-medium">
            <span className="text-xs">macro-protein</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-macro-carbs text-white text-center font-medium">
            <span className="text-xs">macro-carbs</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-macro-fat text-white text-center font-medium">
            <span className="text-xs">macro-fat</span>
          </div>
        </div>
      </section>

      {/* 2. Stat Tiles & Metrics (tabular-nums) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">2. Stat Tiles (Tabular Numbers)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Current Weight"
            value="80.5"
            unit="kg"
            delta="-0.4 kg"
            trend="positive"
            subtext="vs last week"
          />
          <StatTile
            label="Daily Calories"
            value="2,450"
            unit="kcal"
            delta="+120 kcal"
            trend="neutral"
            subtext="Target: 2,500 kcal"
          />
          <StatTile
            label="Protein Intake"
            value="162"
            unit="g"
            delta="100%"
            trend="positive"
            subtext="Goal met"
          />
          <StatTile
            label="Fitness Score"
            value="88"
            delta="-2 pts"
            trend="negative"
            subtext="Recovery dip"
          />
        </div>
      </section>

      {/* 3. Buttons & Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">3. Buttons & IconButtons</h2>
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="primary" isLoading>
              Loading
            </Button>
            <Button variant="primary" icon={<Dumbbell className="h-4 w-4" />}>
              Start Workout
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <IconButton icon={<Plus className="h-5 w-5" />} aria-label="Add item" variant="primary" />
            <IconButton icon={<Bell className="h-5 w-5" />} aria-label="Notifications" variant="secondary" />
            <IconButton icon={<Sparkles className="h-5 w-5" />} aria-label="Insights" variant="ghost" />
          </div>
        </Card>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">4. Form Inputs & Steppers</h2>
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TextField
              label="Standard Text Field"
              placeholder="Enter workout name..."
              helperText="Descriptive label for the routine"
            />
            <TextField
              label="Validation Error State"
              defaultValue="invalid input"
              error="Value must be greater than zero"
            />
            <Select
              label="Goal Type"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              options={[
                { value: 'fat_loss', label: 'Fat Loss' },
                { value: 'muscle_gain', label: 'Muscle Gain' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
            <NumberStepper
              label="Target Weight (kg)"
              value={stepperVal}
              onChange={setStepperVal}
              step={0.5}
              min={40}
              max={200}
              unit="kg"
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">Segmented Control</label>
              <SegmentedControl
                value={segmentVal}
                onChange={setSegmentVal}
                options={[
                  { value: 'plan', label: 'Plan' },
                  { value: 'history', label: 'History' },
                  { value: 'exercises', label: 'Exercises' },
                ]}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Radix Tabs & List Rows */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">5. Tabs & List Rows</h2>
        <Card className="p-6">
          <Tabs defaultValue="week">
            <TabsList className="mb-4">
              <TabsTrigger value="week">Week View</TabsTrigger>
              <TabsTrigger value="month">Month View</TabsTrigger>
              <TabsTrigger value="year">Year View</TabsTrigger>
            </TabsList>
            <TabsContent value="week">
              <div className="divide-y divide-border">
                <ListRow
                  label="Barbell Bench Press"
                  sublabel="Chest • 3 sets completed"
                  value="80.0 kg"
                  action={<ChevronRight className="h-4 w-4 text-text-3" />}
                />
                <ListRow
                  label="Incline Dumbbell Flyes"
                  sublabel="Chest • 3 sets completed"
                  value="24.0 kg"
                  action={<ChevronRight className="h-4 w-4 text-text-3" />}
                />
                <ListRow
                  label="Tricep Rope Pushdown"
                  sublabel="Arms • 4 sets completed"
                  value="32.5 kg"
                  action={<ChevronRight className="h-4 w-4 text-text-3" />}
                />
              </div>
            </TabsContent>
            <TabsContent value="month">
              <p className="text-sm text-text-2 p-4">Monthly historical rollup data.</p>
            </TabsContent>
            <TabsContent value="year">
              <p className="text-sm text-text-2 p-4">Yearly progress summary.</p>
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      {/* 6. Feedback, Banners & Chips */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">6. Banners, Chips & Error States</h2>
        <div className="space-y-3">
          <Banner variant="info" title="Session Syncing">
            Your workout logs are kept locally and will sync once connected.
          </Banner>
          <Banner variant="success" title="Target Reached">
            You completed all 4 scheduled workouts this week.
          </Banner>
          <Banner variant="warning" title="Calorie Deficit Warning">
            Intake is more than 800 kcal below recommended target.
          </Banner>
          <Banner variant="danger" title="Connection Interrupted" onDismiss={() => {}}>
            Could not reach remote API endpoint.
          </Banner>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Chip variant="neutral">Neutral Chip</Chip>
          <Chip variant="accent">Accent Active</Chip>
          <Chip variant="success">Completed</Chip>
          <Chip variant="warning">Behind Pace</Chip>
          <Chip variant="danger">Over Target</Chip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <EmptyState
            title="No Workouts Found"
            message="You haven't logged any training sessions yet this week."
            actionLabel="Start Workout"
            onAction={() => {}}
          />
          <ErrorState
            title="Failed to Load Forecast"
            message="Could not retrieve the 28-day projection from the server."
            onRetry={() => {}}
          />
        </div>
      </section>

      {/* 7. Progress & Indicators */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">7. Progress Bars & Rings</h2>
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-2">Weekly Workout Adherence</span>
              <span className="font-semibold text-text">75%</span>
            </div>
            <ProgressBar value={75} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-2">Danger State Progress</span>
              <span className="font-semibold text-danger">90%</span>
            </div>
            <ProgressBar value={90} variant="danger" />
          </div>

          <div className="flex items-center gap-8 pt-2">
            <div className="flex items-center gap-3">
              <Ring value={82} size={64} strokeWidth={6} />
              <div>
                <p className="text-sm font-semibold text-text">Daily Calories</p>
                <p className="text-xs text-text-3">1,850 / 2,250 kcal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ring value={100} size={64} strokeWidth={6} variant="accent" />
              <div>
                <p className="text-sm font-semibold text-text">Protein Target</p>
                <p className="text-xs text-text-3">160 / 160 g met</p>
              </div>
            </div>
          </div>

          {/* MacroBar */}
          <div className="pt-2">
            <h3 className="text-sm font-medium text-text mb-2">Macro Distribution</h3>
            <MacroBar protein={150} carbs={210} fat={65} />
          </div>
        </Card>
      </section>

      {/* 8. Recharts Wrappers */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">8. Recharts Wrappers (Line & Bar)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-text mb-4">Body Weight Trend (kg)</h3>
            <LineChart
              data={lineData}
              xAxisKey="date"
              series={[{ dataKey: 'weight', name: 'Weight', color: '#0F766E' }]}
              yAxisUnit="kg"
              height={220}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-text mb-4">Daily Calorie Intake (kcal)</h3>
            <BarChart
              data={barData}
              xAxisKey="day"
              series={[{ dataKey: 'calories', name: 'Calories', color: '#2DD4BF' }]}
              height={220}
            />
          </Card>
        </div>
      </section>

      {/* 9. Overlays: Dialog, BottomSheet, Toast */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">9. Overlays & Dialogs</h2>
        <Card className="p-6 flex flex-wrap gap-4 items-center">
          <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
            Open Dialog
          </Button>
          <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
            Open BottomSheet
          </Button>
          <Button variant="secondary" onClick={() => setIsToastOpen(true)}>
            Trigger Toast
          </Button>
        </Card>

        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Confirm Workout Discard"
          description="Are you sure you want to discard this live session draft? This action cannot be undone."
          primaryAction={{
            label: 'Discard Session',
            variant: 'destructive',
            onClick: () => setIsDialogOpen(false),
          }}
          secondaryAction={{
            label: 'Keep Working Out',
            onClick: () => setIsDialogOpen(false),
          }}
        />

        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Add Custom Exercise"
        >
          <div className="space-y-4 py-2">
            <TextField label="Exercise Name" placeholder="e.g. Incline Dumbbell Press" />
            <Button fullWidth onClick={() => setIsSheetOpen(false)}>
              Add to Workout
            </Button>
          </div>
        </BottomSheet>

        <Toast
          isOpen={isToastOpen}
          onClose={() => setIsToastOpen(false)}
          title="Profile Saved"
          description="Your nutrition targets were recalculated."
          variant="success"
        />
      </section>

      {/* 10. Skeleton Loading States */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">10. Skeletons</h2>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </Card>
      </section>
    </div>
  );
};
