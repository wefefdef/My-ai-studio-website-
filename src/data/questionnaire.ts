import { Question } from '../types';

export const QUESTIONS: Question[] = [
  {
    title: 'Your Age',
    subtitle: 'Select your age range',
    options: ['20-30', '31-40', '41-50', '50+'],
  },
  {
    title: 'Your Profession',
    subtitle: 'What do you do?',
    options: ['Student', 'Employee', 'Business Owner', 'Freelancer', 'Other'],
  },
  {
    title: 'Trading Experience',
    subtitle: 'Have you ever done trading before?',
    options: ['Yes', 'No'],
  },
  {
    title: 'Reason for Investment',
    subtitle: 'What is your reason for investment?',
    options: ['Growth', 'Financial Stability', 'Passive Income', 'Wealth Protection'],
  },
  {
    title: 'Trading Method',
    subtitle: 'How will you trade?',
    options: ['Self Trading', 'Help of Robot'],
  },
  {
    title: 'How Did You Know About Us?',
    subtitle: 'How did you discover our platform?',
    options: ['Friend', 'News', 'Self Search', 'Social Media'],
  },
];
