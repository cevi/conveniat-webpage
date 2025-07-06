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
        "Start your final day with a hearty breakfast. Choose from a variety of options including fresh fruits, pastries, and hot dishes to fuel up for the day's activities.",
      mapCoordinates: { x: 75, y: 45 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 10,
      title: 'Hiking Trip',
      time: '10:00 - 14:00',
      location: 'Local Trails',
      details: 'Enjoy a scenic hike.',
      fullDescription:
        'Explore the beautiful local trails on this guided hiking adventure. The moderate difficulty trail offers stunning views and a chance to connect with nature. Lunch will be provided on the trail.',
      mapCoordinates: { x: 10, y: 80 },
      locationId: '686a5386f498347875c3556e',
    },
    {
      id: 11,
      title: 'Departure',
      time: '14:00 - 16:00',
      location: 'Main Hall',
      details: 'Check-out and departure.',
      fullDescription:
        'Time to say goodbye! Please return your room keys and any borrowed equipment to the Main Hall. Safe travels, and we hope to see you again soon!',
      mapCoordinates: { x: 50, y: 30 },
      locationId: '686a5386f498347875c3556e',
    },
  ],
};
