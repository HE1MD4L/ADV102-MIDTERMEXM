import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const STORAGE_KEYS = {
  GAMES: '@game_library_games',
  BORROWED_GAMES: '@game_library_borrowed',
  STATS: '@game_library_stats',
};

// Initial Game inventory data with your specific games
const INITIAL_GAMES = [
  { 
    id: '1', 
    title: 'Elden Ring', 
    artist: 'FromSoftware',
    genre: 'Action RPG',
    platform: 'PC/PS4/PS5/Xbox',
    quantity: 5, 
    available: 5,
    releaseYear: 2022,
    rating: 'M',
    image: require('../assets/EldenRinglogo.png')
  },
  { 
    id: '2', 
    title: 'Sekiro: Shadows Die Twice', 
    artist: 'FromSoftware',
    genre: 'Action-Adventure',
    platform: 'PC/PS4/Xbox',
    quantity: 3, 
    available: 3,
    releaseYear: 2019,
    rating: 'M',
    image: require('../assets/Sekirologo.png')
  },
  { 
    id: '3', 
    title: 'Bloodborne', 
    artist: 'FromSoftware',
    genre: 'Action RPG',
    platform: 'PS4',
    quantity: 4, 
    available: 4,
    releaseYear: 2015,
    rating: 'M',
    image: require('../assets/Bloodbornelogo.png')
  },
  { 
    id: '4', 
    title: 'The Witcher 3: Wild Hunt', 
    artist: 'CD Projekt Red',
    genre: 'RPG',
    platform: 'PC/PS4/Xbox/Switch',
    quantity: 3, 
    available: 3,
    releaseYear: 2015,
    rating: 'M',
    image: require('../assets/Witcher3logo.png')
  },
  { 
    id: '5', 
    title: 'God of War Ragnarök', 
    artist: 'Santa Monica Studio',
    genre: 'Action',
    platform: 'PS4/PS5',
    quantity: 2, 
    available: 2,
    releaseYear: 2022,
    rating: 'M',
    image: require('../assets/GodofWarRagnarokLogo.png')
  },
];

const INITIAL_STATS = {
  totalIncome: 0,
  totalBorrowed: 0, // This will now count completed returns only
};

// Initialize database
export const initDB = async () => {
  try {
    const gamesExist = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
    const borrowedExist = await AsyncStorage.getItem(STORAGE_KEYS.BORROWED_GAMES);
    const statsExist = await AsyncStorage.getItem(STORAGE_KEYS.STATS);

    if (!gamesExist) {
      await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(INITIAL_GAMES));
    }
    if (!borrowedExist) {
      await AsyncStorage.setItem(STORAGE_KEYS.BORROWED_GAMES, JSON.stringify([]));
    }
    if (!statsExist) {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(INITIAL_STATS));
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Game Functions
export const getGames = async (): Promise<any[]> => {
  try {
    const games = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
    return games ? JSON.parse(games) : [];
  } catch (error) {
    console.error('Error getting games:', error);
    return [];
  }
};

export const updateGames = async (games: any[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  } catch (error) {
    console.error('Error updating games:', error);
  }
};

// Borrowed Games Functions
export const getBorrowedGames = async (): Promise<any[]> => {
  try {
    const borrowed = await AsyncStorage.getItem(STORAGE_KEYS.BORROWED_GAMES);
    return borrowed ? JSON.parse(borrowed) : [];
  } catch (error) {
    console.error('Error getting borrowed games:', error);
    return [];
  }
};

export const addBorrowedGame = async (borrowedGame: any) => {
  try {
    const borrowed = await getBorrowedGames();
    borrowed.push(borrowedGame);
    await AsyncStorage.setItem(STORAGE_KEYS.BORROWED_GAMES, JSON.stringify(borrowed));
    
    // REMOVED: stats.totalBorrowed increment from here
    // Quests Completed only increments on successful return
    
    return borrowed;
  } catch (error) {
    console.error('Error adding borrowed game:', error);
    return [];
  }
};

export const removeBorrowedGame = async (borrowId: string) => {
  try {
    const borrowed = await getBorrowedGames();
    const updatedBorrowed = borrowed.filter((item: any) => item.borrowId !== borrowId);
    await AsyncStorage.setItem(STORAGE_KEYS.BORROWED_GAMES, JSON.stringify(updatedBorrowed));
    return updatedBorrowed;
  } catch (error) {
    console.error('Error removing borrowed game:', error);
    return [];
  }
};

// Stats Functions
export const getStats = async (): Promise<{ totalIncome: number; totalBorrowed: number }> => {
  try {
    const stats = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    return stats ? JSON.parse(stats) : INITIAL_STATS;
  } catch (error) {
    console.error('Error getting stats:', error);
    return INITIAL_STATS;
  }
};

export const updateStats = async (stats: { totalIncome: number; totalBorrowed: number }) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating stats:', error);
  }
};

export const addIncome = async (amount: number) => {
  try {
    const stats = await getStats();
    stats.totalIncome += amount;
    await updateStats(stats);
    return stats;
  } catch (error) {
    console.error('Error adding income:', error);
    return null;
  }
};

// NEW FUNCTION: Increment quests completed count (called when game is successfully returned)
export const incrementQuestsCompleted = async () => {
  try {
    const stats = await getStats();
    stats.totalBorrowed += 1;
    await updateStats(stats);
    return stats;
  } catch (error) {
    console.error('Error incrementing quests completed:', error);
    return null;
  }
};

// Calculate penalty (₱2 per day overdue)
export const calculatePenalty = (dueDate: string, returnDate: string = moment().format()): number => {
  const due = moment(dueDate);
  const returned = moment(returnDate);
  const daysLate = returned.diff(due, 'days');
  
  if (daysLate > 0) {
    return daysLate * 2;
  }
  return 0;
};

// Generate unique borrow ID
export const generateBorrowId = (): string => {
  return 'BORROW_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};