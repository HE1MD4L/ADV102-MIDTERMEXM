import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Card, Title, Button, Portal, Dialog } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  getGames, 
  getBorrowedGames, 
  updateGames, 
  removeBorrowedGame,
  calculatePenalty,
  addIncome,
  incrementQuestsCompleted
} from '../../utils/storage';
import { Colors } from '../../constants/color';
import moment from 'moment';

export default function ReturnScreen() {
  const [borrowedGames, setBorrowedGames] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedBorrow, setSelectedBorrow] = useState<any>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [returnDetails, setReturnDetails] = useState<any>(null);
  const [returnDate, setReturnDate] = useState(new Date());
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [tempReturnDate, setTempReturnDate] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const gamesData = await getGames();
    const borrowedData = await getBorrowedGames();
    
    const updatedBorrowed = borrowedData.map(item => ({
      ...item,
      currentPenalty: calculatePenalty(item.dueDate)
    }));
    
    setGames(gamesData);
    setBorrowedGames(updatedBorrowed);
  };

  const handleReturnPress = (borrowed: any) => {
    setSelectedBorrow(borrowed);
    setReturnDate(new Date());
    setTempReturnDate(null);
    
    const penalty = calculatePenalty(borrowed.dueDate);
    const daysLate = penalty > 0 ? moment().diff(moment(borrowed.dueDate), 'days') : 0;
    
    setReturnDetails({
      penalty,
      daysLate,
    });
    
    setDialogVisible(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        setReturnDate(selectedDate);
        const penalty = calculatePenalty(selectedBorrow.dueDate, moment(selectedDate).format());
        const daysLate = penalty > 0 ? moment(selectedDate).diff(moment(selectedBorrow.dueDate), 'days') : 0;
        setReturnDetails({
          penalty,
          daysLate,
        });
        setShowReturnPicker(false);
      } else if (event.type === 'dismissed') {
        setShowReturnPicker(false);
      }
    } else {
      if (selectedDate) {
        setTempReturnDate(selectedDate);
      }
    }
  };

  const confirmDate = () => {
    if (Platform.OS === 'ios' && tempReturnDate) {
      setReturnDate(tempReturnDate);
      const penalty = calculatePenalty(selectedBorrow.dueDate, moment(tempReturnDate).format());
      const daysLate = penalty > 0 ? moment(tempReturnDate).diff(moment(selectedBorrow.dueDate), 'days') : 0;
      setReturnDetails({
        penalty,
        daysLate,
      });
      setShowReturnPicker(false);
      setTempReturnDate(null);
    }
  };

  const cancelDate = () => {
    setShowReturnPicker(false);
    setTempReturnDate(null);
  };

  const handleReturnConfirm = async () => {
    try {
      const formattedReturnDate = moment(returnDate).format();
      const finalPenalty = calculatePenalty(selectedBorrow.dueDate, formattedReturnDate);
      
      const updatedGames = games.map(game => {
        if (game.id === selectedBorrow.cdId) {
          return { ...game, available: game.available + 1 };
        }
        return game;
      });

      if (finalPenalty > 0) {
        await addIncome(finalPenalty);
      }

      await incrementQuestsCompleted();
      await updateGames(updatedGames);
      await removeBorrowedGame(selectedBorrow.borrowId);

      setGames(updatedGames);
      setBorrowedGames(prev => prev.filter(b => b.borrowId !== selectedBorrow.borrowId));
      setDialogVisible(false);

      if (finalPenalty > 0) {
        Alert.alert(
          '⚔️ Quest Complete',
          `Game returned on ${moment(returnDate).format('MMMM DD, YYYY')}\nPenalty paid: ₱${finalPenalty}\nQuest completed! +1 Quest`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '⚔️ Quest Complete',
          `Game returned on ${moment(returnDate).format('MMMM DD, YYYY')}\nReturned on time! +50 XP\nQuest completed! +1 Quest`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to return game. Please try again.');
    }
  };

  const isOverdue = (dueDate: string, checkDate: Date = new Date()) => {
    return moment(checkDate).isAfter(dueDate);
  };

  const getGameImage = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    return game?.image;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="trophy" size={40} color={Colors.primary} />
          <Text style={styles.headerTitle}>COMPLETE QUESTS</Text>
          <Text style={styles.headerSubtitle}>Return borrowed games</Text>
        </View>

        {borrowedGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={60} color={Colors.success} />
            <Text style={styles.emptyText}>No active quests</Text>
          </View>
        ) : (
          borrowedGames.map(borrowed => {
            const overdue = isOverdue(borrowed.dueDate);
            const penalty = calculatePenalty(borrowed.dueDate);
            const gameImage = getGameImage(borrowed.cdId);
            
            return (
              <TouchableOpacity
                key={borrowed.borrowId}
                onPress={() => handleReturnPress(borrowed)}
                activeOpacity={0.7}
              >
                <Card style={[
                  styles.borrowedCard,
                  overdue && styles.overdueCard
                ]}>
                  <Card.Content style={styles.cardContent}>
                    {gameImage ? (
                      <ExpoImage 
                        source={gameImage} 
                        style={styles.gameImage}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.gameImage, styles.placeholderImage]}>
                        <Ionicons name="disc" size={40} color={overdue ? Colors.error : Colors.secondary} />
                      </View>
                    )}
                    
                    <View style={styles.gameInfo}>
                      <View style={styles.titleRow}>
                        <Title style={[styles.gameTitle, overdue && styles.overdueTitle]}>
                          {borrowed.cdTitle}
                        </Title>
                        {overdue && (
                          <View style={styles.overdueBadge}>
                            <Text style={styles.overdueBadgeText}>OVERDUE</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.borrowerSection}>
                        <Ionicons name="person" size={14} color={overdue ? Colors.error : Colors.secondary} />
                        <Text style={[styles.borrowerName, overdue && styles.overdueText]}>
                          {borrowed.borrowerName}
                        </Text>
                      </View>

                      <View style={styles.dateGrid}>
                        <Text style={styles.dateLabel}>Borrowed:</Text>
                        <Text style={styles.dateValue}>
                          {moment(borrowed.borrowDate).format('MMM DD, YYYY')}
                        </Text>
                        <Text style={styles.dateLabel}>Due:</Text>
                        <Text style={[styles.dateValue, overdue && styles.overdueText]}>
                          {moment(borrowed.dueDate).format('MMM DD, YYYY')}
                        </Text>
                      </View>

                      {penalty > 0 && (
                        <View style={styles.penaltyPreview}>
                          <Ionicons name="warning" size={14} color={Colors.error} />
                          <Text style={styles.penaltyPreviewText}>
                            Penalty if returned today: ₱{penalty}
                          </Text>
                        </View>
                      )}

                      <View style={styles.daysInfo}>
                        <Ionicons 
                          name="hourglass" 
                          size={14} 
                          color={overdue ? Colors.error : Colors.success} 
                        />
                        <Text style={[
                          styles.daysText,
                          overdue && styles.overdueDaysText
                        ]}>
                          {overdue 
                            ? `${moment().diff(moment(borrowed.dueDate), 'days')} days overdue`
                            : `${moment(borrowed.dueDate).diff(moment(), 'days')} days left`
                          }
                        </Text>
                      </View>

                      <Button 
                        mode="contained" 
                        onPress={() => handleReturnPress(borrowed)}
                        style={[styles.returnButton, overdue && styles.overdueReturnButton]}
                        labelStyle={styles.buttonLabel}
                        icon={() => <Ionicons name="trophy" size={16} color={Colors.background} />}
                      >
                        Complete Quest
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>🏆 Complete Quest</Dialog.Title>
          <Dialog.Content>
            {selectedBorrow && returnDetails && (
              <View>
                <View style={styles.selectedGameInfo}>
                  {getGameImage(selectedBorrow.cdId) ? (
                    <ExpoImage 
                      source={getGameImage(selectedBorrow.cdId)} 
                      style={styles.dialogImage}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons name="disc" size={40} color={returnDetails.penalty > 0 ? Colors.error : Colors.success} />
                  )}
                  <View style={styles.selectedGameText}>
                    <Text style={styles.selectedGameTitle}>{selectedBorrow.cdTitle}</Text>
                    <Text style={styles.selectedGameArtist}>Borrower: {selectedBorrow.borrowerName}</Text>
                  </View>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerLabel}>Select Return Date:</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowReturnPicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color={Colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {moment(returnDate).format('MMMM DD, YYYY')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Web Date Picker */}
                {Platform.OS === 'web' && showReturnPicker && (
                  <View style={styles.webDateContainer}>
                    <input
                      type="date"
                      value={returnDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        setReturnDate(date);
                        const penalty = calculatePenalty(selectedBorrow.dueDate, moment(date).format());
                        const daysLate = penalty > 0 ? moment(date).diff(moment(selectedBorrow.dueDate), 'days') : 0;
                        setReturnDetails({
                          penalty,
                          daysLate,
                        });
                      }}
                      max={new Date().toISOString().split('T')[0]}
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
                        onPress={() => setShowReturnPicker(false)}
                        textColor={Colors.primary}
                      >
                        Done
                      </Button>
                    </View>
                  </View>
                )}

                {/* Native Date Picker */}
                {Platform.OS !== 'web' && showReturnPicker && (
                  <>
                    <DateTimePicker
                      value={tempReturnDate || returnDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                      onChange={onDateChange}
                      maximumDate={new Date()}
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

                <View style={styles.questSummary}>
                  <Text style={styles.summaryTitle}>Quest Summary</Text>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Started:</Text>
                    <Text style={styles.summaryValue}>
                      {moment(selectedBorrow.borrowDate).format('MMM DD, YYYY')}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Deadline:</Text>
                    <Text style={styles.summaryValue}>
                      {moment(selectedBorrow.dueDate).format('MMM DD, YYYY')}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Returning:</Text>
                    <Text style={[
                      styles.summaryValue,
                      moment(returnDate).isAfter(selectedBorrow.dueDate) && styles.overdueValue
                    ]}>
                      {moment(returnDate).format('MMM DD, YYYY')}
                    </Text>
                  </View>

                  {returnDetails.daysLate > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Days Late:</Text>
                      <Text style={[styles.summaryValue, styles.overdueValue]}>
                        {returnDetails.daysLate}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.summaryRow, styles.penaltyRow]}>
                    <Text style={styles.penaltyLabel}>Penalty:</Text>
                    <Text style={[
                      styles.penaltyValue,
                      returnDetails.penalty > 0 && styles.penaltyPositive
                    ]}>
                      ₱{returnDetails.penalty}
                    </Text>
                  </View>

                  <View style={styles.questCompletionBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.questCompletionText}>
                      +1 Quest upon completion
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setDialogVisible(false)} textColor={Colors.error}>
              Cancel
            </Button>
            <Button onPress={handleReturnConfirm} textColor={Colors.primary}>
              Complete Quest
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
  borrowedCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overdueCard: {
    borderColor: Colors.error,
    backgroundColor: '#2A1F1F',
  },
  cardContent: {
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
    marginBottom: 6,
  },
  gameTitle: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  overdueTitle: {
    color: Colors.error,
  },
  overdueBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueBadgeText: {
    color: Colors.background,
    fontSize: 8,
    fontWeight: 'bold',
  },
  borrowerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  borrowerName: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  overdueText: {
    color: Colors.error,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  dateLabel: {
    width: 60,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dateValue: {
    width: 100,
    fontSize: 11,
    color: Colors.text,
  },
  penaltyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  penaltyPreviewText: {
    color: Colors.error,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  daysInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  daysText: {
    marginLeft: 6,
    fontSize: 11,
    color: Colors.success,
  },
  overdueDaysText: {
    color: Colors.error,
  },
  returnButton: {
    backgroundColor: Colors.primary,
  },
  overdueReturnButton: {
    backgroundColor: Colors.error,
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
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
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
  questSummary: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  overdueValue: {
    color: Colors.error,
  },
  penaltyRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  penaltyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  penaltyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  penaltyPositive: {
    color: Colors.error,
  },
  questCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  questCompletionText: {
    color: Colors.success,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dialogActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});