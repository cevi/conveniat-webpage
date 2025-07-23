import type { ProgramEntry } from '@/features/schedule/types/program';

export const dailyPrograms: { [key: string]: ProgramEntry[] } = {
  '2025-02-22': [
    {
      id: 1,
      title: 'Arrival & Check-in',
      time: '14:00 - 16:00',
      location: 'Main Hall',
      details: 'Check-in and get settled.',
      fullDescription:
        'Welcome to our retreat! Please proceed to the Main Hall for check-in. Our staff will provide you with your room keys, welcome package, and orientation materials. Take this time to familiarize yourself with the facilities and meet fellow participants.',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 2,
      title: 'Welcome Dinner',
      time: '18:00 - 20:00',
      location: 'Dining Hall',
      details: 'Welcome dinner and introductions.',
      fullDescription:
        'Join us for a delicious welcome dinner featuring local cuisine. This is a great opportunity to meet other participants, share your expectations for the retreat, and enjoy a relaxed evening before the program begins.',
      mapCoordinates: { x: 75, y: 45 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-23': [
    {
      id: 3,
      title: 'Morning Yoga',
      time: '08:00 - 09:00',
      location: 'Yoga Studio',
      details: 'Start the day with a relaxing yoga session.',
      fullDescription:
        'Begin your day with an energizing yoga session led by our certified instructor. This gentle flow is suitable for all levels and will help you center yourself for the day ahead. Please bring a yoga mat or use one of ours.',
      mapCoordinates: { x: 25, y: 60 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 4,
      title: 'Workshop: Coding Basics',
      time: '10:00 - 12:00',
      location: 'Classroom 1',
      details: 'Introduction to coding fundamentals.',
      fullDescription:
        "Dive into the world of programming with this comprehensive introduction to coding basics. We'll cover fundamental concepts, syntax, and best practices. Perfect for beginners or those looking to refresh their knowledge.",
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 5,
      title: 'Lunch Break',
      time: '12:00 - 13:00',
      location: 'Dining Hall',
      details: 'Lunch break.',
      fullDescription:
        'Enjoy a nutritious lunch with fresh, locally-sourced ingredients. Vegetarian and vegan options are available. Use this time to recharge and connect with fellow participants.',
      mapCoordinates: { x: 75, y: 45 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 6,
      title: 'Workshop: Advanced React',
      time: '13:00 - 15:00',
      location: 'Classroom 2',
      details: 'Dive deeper into React concepts.',
      fullDescription:
        'Take your React skills to the next level with advanced concepts including hooks, context, performance optimization, and modern patterns. Hands-on exercises and real-world examples included.',
      mapCoordinates: { x: 60, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 7,
      title: 'Free Time / Networking',
      time: '15:00 - 17:00',
      location: 'Common Area',
      details: 'Relax, network, and socialize.',
      fullDescription:
        'Unwind and connect with fellow participants in our comfortable common area. Enjoy refreshments, participate in informal discussions, or simply relax and take in the beautiful surroundings.',
      mapCoordinates: { x: 50, y: 50 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 8,
      title: 'Evening Presentation',
      time: '19:00 - 20:30',
      location: 'Main Hall',
      details: 'Guest speaker presentation.',
      fullDescription:
        'Join us for an inspiring presentation by our guest speaker, a renowned expert in the field. This thought-provoking session will provide valuable insights and perspectives on current industry trends.',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-24': [
    {
      id: 9,
      title: 'Breakfast',
      time: '08:00 - 09:00',
      location: 'Dining Hall',
      details: 'Breakfast.',
      fullDescription:
        "Start your day with a hearty breakfast. Choose from a variety of options including fresh fruits, pastries, and hot dishes to fuel up for the day's activities.",
      mapCoordinates: { x: 75, y: 45 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 10,
      title: 'Workshop: TypeScript Fundamentals',
      time: '10:00 - 12:00',
      location: 'Classroom 1',
      details: 'Learn TypeScript basics and best practices.',
      fullDescription:
        'Master TypeScript fundamentals including types, interfaces, generics, and advanced patterns. Perfect for JavaScript developers looking to add type safety to their projects.',
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 11,
      title: 'Lunch & Networking',
      time: '12:00 - 13:30',
      location: 'Dining Hall',
      details: 'Extended lunch with networking opportunities.',
      fullDescription:
        'Enjoy lunch while connecting with fellow participants. Share experiences, exchange contacts, and discuss potential collaborations.',
      mapCoordinates: { x: 75, y: 45 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 12,
      title: 'Workshop: Next.js Deep Dive',
      time: '13:30 - 15:30',
      location: 'Classroom 2',
      details: 'Advanced Next.js concepts and patterns.',
      fullDescription:
        'Explore advanced Next.js features including App Router, Server Components, streaming, and performance optimization techniques.',
      mapCoordinates: { x: 60, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-25': [
    {
      id: 13,
      title: 'Morning Meditation',
      time: '08:00 - 08:30',
      location: 'Yoga Studio',
      details: 'Start the day with mindfulness.',
      fullDescription:
        'Begin your day with a guided meditation session to center your mind and prepare for productive learning.',
      mapCoordinates: { x: 25, y: 60 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 14,
      title: 'Workshop: Database Design',
      time: '09:00 - 11:00',
      location: 'Classroom 1',
      details: 'Learn database design principles.',
      fullDescription:
        'Master database design fundamentals, normalization, relationships, and best practices for modern applications.',
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 15,
      title: 'Team Project Work',
      time: '11:30 - 15:00',
      location: 'Common Area',
      details: 'Collaborative project development.',
      fullDescription:
        'Work in teams on a real-world project, applying the concepts learned throughout the week. Mentors will be available for guidance.',
      mapCoordinates: { x: 50, y: 50 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-26': [
    {
      id: 16,
      title: 'Workshop: API Development',
      time: '09:00 - 11:00',
      location: 'Classroom 2',
      details: 'Build robust APIs with best practices.',
      fullDescription:
        'Learn to design and implement RESTful APIs, handle authentication, validation, and error handling.',
      mapCoordinates: { x: 60, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 17,
      title: 'Code Review Session',
      time: '11:30 - 12:30',
      location: 'Classroom 1',
      details: 'Peer code review and feedback.',
      fullDescription:
        'Practice code review skills, learn to give and receive constructive feedback, and improve code quality.',
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 18,
      title: 'Afternoon Hike',
      time: '14:00 - 17:00',
      location: 'Local Trails',
      details: 'Explore nature and clear your mind.',
      fullDescription:
        'Take a break from coding with a refreshing hike through scenic local trails. Great for networking and mental clarity.',
      mapCoordinates: { x: 10, y: 80 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-27': [
    {
      id: 19,
      title: 'Workshop: Testing Strategies',
      time: '09:00 - 11:00',
      location: 'Classroom 1',
      details: 'Learn comprehensive testing approaches.',
      fullDescription:
        'Master unit testing, integration testing, and end-to-end testing strategies for robust applications.',
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 20,
      title: 'Workshop: Performance Optimization',
      time: '11:30 - 13:30',
      location: 'Classroom 2',
      details: 'Optimize your applications for speed.',
      fullDescription:
        'Learn techniques for optimizing web application performance, including bundle optimization, lazy loading, and caching strategies.',
      mapCoordinates: { x: 60, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 21,
      title: 'Project Presentations',
      time: '15:00 - 17:00',
      location: 'Main Hall',
      details: 'Present your team projects.',
      fullDescription:
        "Teams present their projects to the group, showcasing what they've built and lessons learned.",
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-02-28': [], // Free day
  '2025-03-01': [], // Free day
  '2025-03-02': [
    {
      id: 22,
      title: 'Workshop: DevOps Basics',
      time: '09:00 - 11:00',
      location: 'Classroom 1',
      details: 'Introduction to DevOps practices.',
      fullDescription:
        'Learn fundamental DevOps concepts including CI/CD, containerization, and deployment strategies.',
      mapCoordinates: { x: 40, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 23,
      title: 'Workshop: Security Best Practices',
      time: '11:30 - 13:30',
      location: 'Classroom 2',
      details: 'Secure your applications.',
      fullDescription:
        'Learn essential security practices for web applications, including authentication, authorization, and common vulnerability prevention.',
      mapCoordinates: { x: 60, y: 20 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-03-03': [
    {
      id: 24,
      title: 'Final Project Work',
      time: '09:00 - 15:00',
      location: 'Common Area',
      details: 'Complete your final projects.',
      fullDescription:
        'Dedicated time to finish your final projects with mentor support and peer collaboration.',
      mapCoordinates: { x: 50, y: 50 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-03-04': [
    {
      id: 25,
      title: 'Final Presentations',
      time: '10:00 - 12:00',
      location: 'Main Hall',
      details: 'Present your final projects.',
      fullDescription:
        'Showcase your final projects to the entire group and receive feedback from mentors and peers.',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 26,
      title: 'Closing Ceremony',
      time: '14:00 - 15:00',
      location: 'Main Hall',
      details: 'Celebrate your achievements.',
      fullDescription:
        'Join us for the closing ceremony where we celebrate your achievements and provide certificates of completion.',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-03-05': [
    {
      id: 27,
      title: 'Departure',
      time: '10:00 - 12:00',
      location: 'Main Hall',
      details: 'Check-out and departure.',
      fullDescription:
        'Time to say goodbye! Please return your room keys and any borrowed equipment to the Main Hall. Safe travels, and we hope to see you again soon!',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
  '2025-03-06': [], // Buffer day for late departures
  '2025-03-07': [], // Buffer day for late departures
};
