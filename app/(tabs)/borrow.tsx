import React, { useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Card, Title, Paragraph, Button, Portal, Dialog } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  getGames, 
  updateGames, 
  addBorrowedGame, 
  generateBorrowId 
} from '../../utils/storage';
import { Colors } from '../../constants/color';
import moment from 'moment';

export default function BorrowScreen() {
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showBorrowPicker, setShowBorrowPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [activePicker, setActivePicker] = useState<'borrow' | 'due'>('borrow');
  const [tempBorrowDate, setTempBorrowDate] = useState<Date | null>(null);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGames();
    }, [])
  );

  const loadGames = async () => {
    const gamesData = await getGames();
    setGames(gamesData);
  };

  const handleBorrowPress = (game: any) => {
    if (game.available <= 0) {
      Alert.alert('❌ Game Not Available', 'This game is currently out of stock!');
      return;
    }
    setSelectedGame(game);
    setBorrowDate(new Date());
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setTempBorrowDate(null);
    setTempDueDate(null);
    setDialogVisible(true);
    setBorrowerName('');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // For Android, keep picker open
      if (event.type === 'set' && selectedDate) {
        if (activePicker === 'borrow') {
          setBorrowDate(selectedDate);
          const newDueDate = new Date(selectedDate);
          newDueDate.setDate(newDueDate.getDate() + 7);
          setDueDate(newDueDate);
          setShowBorrowPicker(false);
        } else {
          setDueDate(selectedDate);
          setShowDuePicker(false);
        }
      } else if (event.type === 'dismissed') {
        setShowBorrowPicker(false);
        setShowDuePicker(false);
      }
    } else {
      // For iOS, keep picker open while selecting
      if (selectedDate) {
        if (activePicker === 'borrow') {
          setTempBorrowDate(selectedDate);
        } else {
          setTempDueDate(selectedDate);
        }
      }
    }
  };

  const confirmDate = () => {
    if (Platform.OS === 'ios') {
      if (activePicker === 'borrow' && tempBorrowDate) {
        setBorrowDate(tempBorrowDate);
        const newDueDate = new Date(tempBorrowDate);
        newDueDate.setDate(newDueDate.getDate() + 7);
        setDueDate(newDueDate);
        setShowBorrowPicker(false);
        setTempBorrowDate(null);
      } else if (activePicker === 'due' && tempDueDate) {
        setDueDate(tempDueDate);
        setShowDuePicker(false);
        setTempDueDate(null);
      }
    }
  };

  const cancelDate = () => {
    setShowBorrowPicker(false);
    setShowDuePicker(false);
    setTempBorrowDate(null);
    setTempDueDate(null);
  };

  const showDatePicker = (picker: 'borrow' | 'due') => {
    setActivePicker(picker);
    if (picker === 'borrow') {
      setTempBorrowDate(borrowDate);
      setShowBorrowPicker(true);
    } else {
      setTempDueDate(dueDate);
      setShowDuePicker(true);
    }
  };

  const handleBorrowConfirm = async () => {
    if (!borrowerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (dueDate < borrowDate) {
      Alert.alert('Error', 'Due date cannot be before borrow date');
      return;
    }

    try {
      const updatedGames = games.map(game => {
        if (game.id === selectedGame.id) {
          return { ...game, available: game.available - 1 };
        }
        return game;
      });
      
      const borrowRecord = {
        borrowId: generateBorrowId(),
        cdId: selectedGame.id,
        cdTitle: selectedGame.title,
        cdArtist: selectedGame.artist,
        borrowerName: borrowerName.trim(),
        borrowDate: moment(borrowDate).format(),
        dueDate: moment(dueDate).format(),
        returned: false,
        penalty: 0
      };

      await updateGames(updatedGames);
      await addBorrowedGame(borrowRecord);
      
      setGames(updatedGames);
      setDialogVisible(false);
      setBorrowerName('');
      
      Alert.alert(
        '✨ Quest Started!', 
        `You have borrowed "${selectedGame.title}"\nBorrowed: ${moment(borrowDate).format('MMMM DD, YYYY')}\nReturn by: ${moment(dueDate).format('MMMM DD, YYYY')}\nLate fee: ₱2/day`,
        [{ text: 'OK' }]
      );
   } catch (error) {
  console.log('Error details:', error); // Use the error to avoid warning
  Alert.alert('Error', 'Failed to borrow CD. Please try again.');
}
  };

  // Handle text input change without crashing
  const handleNameChange = (text: string) => {
    setBorrowerName(text);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="shield" size={40} color={Colors.primary} />
          <Text style={styles.headerTitle}>START A QUEST</Text>
          <Text style={styles.headerSubtitle}>Choose your game to borrow</Text>
        </View>

        {games.filter(game => game.available > 0).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No games available</Text>
          </View>
        ) : (
          games.filter(game => game.available > 0).map(game => (
            <TouchableOpacity
              key={game.id}
              onPress={() => handleBorrowPress(game)}
              activeOpacity={0.7}
            >
              <Card style={styles.gameCard}>
                <Card.Content style={styles.gameCardContent}>
                  {game.image ? (
                    <ExpoImage 
                      source={game.image} 
                      style={styles.gameImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.gameImage, styles.placeholderImage]}>
                      <Ionicons name="disc" size={40} color={Colors.primary} />
                    </View>
                  )}
                  
                  <View style={styles.gameInfo}>
                    <View style={styles.titleRow}>
                      <Title style={styles.gameTitle}>{game.title}</Title>
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>{game.available} left</Text>
                      </View>
                    </View>

                    <Paragraph style={styles.artist}>{game.artist}</Paragraph>

                    <View style={styles.rentalInfo}>
                      <Ionicons name="calendar" size={14} color={Colors.primary} />
                      <Text style={styles.rentalText}>Set your dates</Text>
                      <Ionicons name="cash" size={14} color={Colors.primary} style={styles.rentalIcon} />
                      <Text style={styles.rentalText}>₱2/day late</Text>
                    </View>

                    <Button 
                      mode="contained" 
                      onPress={() => handleBorrowPress(game)}
                      style={styles.borrowButton}
                      labelStyle={styles.buttonLabel}
                      icon={() => <Ionicons name="shield" size={16} color={Colors.background} />}
                    >
                      Start Quest
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>⚔️ Accept Quest</Dialog.Title>
          <Dialog.Content>
            {selectedGame && (
              <View>
                <View style={styles.selectedGameInfo}>
                  {selectedGame.image ? (
                    <ExpoImage 
                      source={selectedGame.image} 
                      style={styles.dialogImage}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons name="disc" size={40} color={Colors.primary} />
                  )}
                  <View style={styles.selectedGameText}>
                    <Text style={styles.selectedGameTitle}>{selectedGame.title}</Text>
                    <Text style={styles.selectedGameArtist}>{selectedGame.artist}</Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textSecondary}
                  value={borrowerName}
                  onChangeText={handleNameChange}
                  keyboardType="default"
                  autoCapitalize="words"
                />

                <View style={styles.datePickerContainer}>
                  <Text style={styles.dateLabel}>Borrow Date:</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => showDatePicker('borrow')}
                  >
                    <Ionicons name="calendar" size={18} color={Colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {moment(borrowDate).format('MMM DD, YYYY')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.dateLabel}>Due Date:</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => showDatePicker('due')}
                  >
                    <Ionicons name="calendar" size={18} color={Colors.secondary} />
                    <Text style={styles.dateButtonText}>
                      {moment(dueDate).format('MMM DD, YYYY')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Web Date Pickers */}
                {Platform.OS === 'web' && showBorrowPicker && (
                  <View style={styles.webDateContainer}>
                    <input
                      type="date"
                      value={borrowDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        setBorrowDate(date);
                        const newDueDate = new Date(date);
                        newDueDate.setDate(newDueDate.getDate() + 7);
                        setDueDate(newDueDate);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        borderWidth: '1px',
                        borderColor: Colors.border,
                        backgroundColor: Colors.card,
                        color: Colors.text,
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <View style={styles.webDateButtons}>
                      <Button 
                        mode="text" 
                        onPress={() => setShowBorrowPicker(false)}
                        textColor={Colors.primary}
                      >
                        Done
                      </Button>
                    </View>
                  </View>
                )}

                {Platform.OS === 'web' && showDuePicker && (
                  <View style={styles.webDateContainer}>
                    <input
                      type="date"
                      value={dueDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        setDueDate(date);
                      }}
                      min={borrowDate.toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        borderWidth: '1px',
                        borderColor: Colors.border,
                        backgroundColor: Colors.card,
                        color: Colors.text,
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <View style={styles.webDateButtons}>
                      <Button 
                        mode="text" 
                        onPress={() => setShowDuePicker(false)}
                        textColor={Colors.primary}
                      >
                        Done
                      </Button>
                    </View>
                  </View>
                )}

                {/* Native Date Pickers */}
                {Platform.OS !== 'web' && showBorrowPicker && (
                  <>
                    <DateTimePicker
                      value={tempBorrowDate || borrowDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                      onChange={onDateChange}
                      minimumDate={new Date()}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={styles.iosButtonContainer}>
                        <Button 
                          mode="contained" 
                          onPress={confirmDate}
                          style={styles.iosConfirmButton}
                          textColor={Colors.background}
                        >
                          Confirm Date
                        </Button>
                        <Button 
                          mode="text" 
                          onPress={cancelDate}
                          textColor={Colors.error}
                        >
                          Cancel
                        </Button>
                      </View>
                    )}
                  </>
                )}

                {Platform.OS !== 'web' && showDuePicker && (
                  <>
                    <DateTimePicker
                      value={tempDueDate || dueDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                      onChange={onDateChange}
                      minimumDate={borrowDate}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={styles.iosButtonContainer}>
                        <Button 
                          mode="contained" 
                          onPress={confirmDate}
                          style={styles.iosConfirmButton}
                          textColor={Colors.background}
                        >
                          Confirm Date
                        </Button>
                        <Button 
                          mode="text" 
                          onPress={cancelDate}
                          textColor={Colors.error}
                        >
                          Cancel
                        </Button>
                      </View>
                    )}
                  </>
                )}

                <View style={styles.rentalPeriodInfo}>
                  <Text style={styles.rentalPeriodText}>
                    Rental Period: {moment(dueDate).diff(moment(borrowDate), 'days')} days
                  </Text>
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setDialogVisible(false)} textColor={Colors.error}>
              Cancel
            </Button>
            <Button 
              onPress={handleBorrowConfirm} 
              textColor={Colors.primary}
              disabled={!borrowerName.trim()}
            >
              Accept Quest
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  gameCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gameCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  gameImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gameInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gameTitle: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  availableBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availableText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  rentalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  rentalIcon: {
    marginLeft: 12,
  },
  rentalText: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.text,
  },
  borrowButton: {
    backgroundColor: Colors.primary,
  },
  buttonLabel: {
    color: Colors.background,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  dialog: {
    backgroundColor: Colors.surface,
  },
  dialogTitle: {
    textAlign: 'center',
    color: Colors.primary,
  },
  selectedGameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dialogImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  selectedGameText: {
    flex: 1,
  },
  selectedGameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  selectedGameArtist: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  datePickerContainer: {
    marginBottom: 12,
  },
  dateLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButtonText: {
    color: Colors.text,
    marginLeft: 8,
    fontSize: 14,
  },
  webDateContainer: {
    width: '100%',
    marginVertical: 8,
  },
  webDateButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  iosButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 8,
  },
  iosConfirmButton: {
    backgroundColor: Colors.primary,
    flex: 0.7,
  },
  rentalPeriodInfo: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  rentalPeriodText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dialogActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});