import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, CheckCircle, Award } from 'lucide-react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { KpiCard } from '../../components/KpiCard';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { spacing } from '../../theme/spacing';
import { mockCourse } from '../../data/mockData';
import { useAppState } from '../../context/AppStateContext';
import './DashboardScreen.css';

const recentActivity = [
  { student: 'CodeWizard', action: 'completed Exercise 11 (Null & Undefined)', time: '2 hours ago' },
  { student: 'GitGuardian', action: 'completed Exercise 10 (Boolean Logic)', time: '3 hours ago' },
  { student: 'ByteRunner', action: 'completed Exercise 9 (Variable Scope)', time: '5 hours ago' },
  { student: 'FunctionFox', action: 'completed Exercise 8 (Constants)', time: '1 day ago' }
];

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { students, modules, exercises } = useAppState();
  const averageLevel =
    students.reduce((sum, s) => sum + s.xpLevel, 0) / Math.max(students.length, 1);
  const avgCompletion =
    students.reduce((sum, s) => sum + s.completionPercent, 0) / Math.max(students.length, 1);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Overview of Programming Essentials 1</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard 
          label="Students Enrolled" 
          value={mockCourse.studentCount.toString()}
          icon={<Users size={24} />}
        />
        <KpiCard 
          label="Average XP Level" 
          value={averageLevel.toFixed(1)}
          icon={<Award size={24} />}
          trend="+0.5 this week"
        />
        <KpiCard 
          label="Average Completion" 
          value={`${avgCompletion.toFixed(0)}%`}
          progressValue={avgCompletion}
          icon={<TrendingUp size={24} />}
          trend="+3% this week"
        />
        <KpiCard 
          label="Exercises Completed (Week)" 
          value={Math.floor(exercises.length * 4).toString()}
          icon={<CheckCircle size={24} />}
          trend="+12 from last week"
        />
      </div>

      {/* Main Content */}
      <div className="dashboard-grid">
        {/* Course Overview */}
        <Card>
          <div className="card-header">
            <h3 className="card-title">Course Overview</h3>
            <div className="card-icon-wrapper">
              <Award size={20} />
            </div>
          </div>
          <div className="course-content">
            <div className="info-box">
              <div className="info-label">Course Name</div>
              <div className="info-value">{mockCourse.name}</div>
            </div>
            <div className="info-grid">
              <div className="info-box">
                <div className="info-label">Year</div>
                <div className="info-value">{mockCourse.year}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Students</div>
                <div className="info-value">{mockCourse.studentCount}</div>
              </div>
            </div>
            <div className="info-box-simple">
              <div className="info-label">Program</div>
              <div className="info-value">{mockCourse.program}</div>
            </div>
            <div className="progress-section">
              <div className="progress-label">Overall Class Completion</div>
              <ProgressBar value={avgCompletion} />
            </div>
            <div className="card-action">
              <Button fullWidth onClick={() => navigate('/modules')}>
                Go to Modules
              </Button>
            </div>
          </div>
        </Card>

        {/* Activity Snapshot */}
        <Card>
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <div className="card-icon-wrapper activity-icon">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-text">
                  <span className="activity-student">{activity.student}</span>
                  {' '}
                  {activity.action}
                </div>
                <div className="activity-time">
                  <span className="activity-dot" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
          <div className="card-action border-top">
            <Button variant="secondary" fullWidth onClick={() => navigate('/students')}>
              View All Students
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
