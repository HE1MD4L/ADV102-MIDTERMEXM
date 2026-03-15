import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { getGames, getBorrowedGames, getStats, calculatePenalty } from '../../utils/storage';
import { Colors } from '../../constants/color';
import moment from 'moment';
export default function HomeScreen() {
  const [games, setGames] = useState<any[]>([]);
  const [borrowedGames, setBorrowedGames] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalBorrowed: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showAvailable, setShowAvailable] = useState(true);

  const loadData = async () => {
    const gamesData = await getGames();
    const borrowedData = await getBorrowedGames();
    const statsData = await getStats();
    
    const updatedBorrowed = borrowedData.map(item => ({
      ...item,
      currentPenalty: calculatePenalty(item.dueDate)
    }));
    
    setGames(gamesData);
    setBorrowedGames(updatedBorrowed);
    setStats(statsData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalAvailable = games.reduce((acc, game) => acc + game.available, 0);

  const getRatingColor = (rating: string) => {
    switch(rating) {
      case 'M': return Colors.error;
      case 'T': return Colors.warning;
      case 'E': return Colors.success;
      default: return Colors.rare;
    }
  };

  return (
    <View style={styles.container}>
      {/* Gaming Header */}
      <View style={styles.gamingHeader}>
        <Ionicons name="game-controller" size={40} color={Colors.primary} />
        <Text style={styles.gamingTitle}>GAME LIBRARY</Text>
        <Text style={styles.gamingSubtitle}>Level 1 Adventurer</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Stats Section - RPG Style */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="cash" size={30} color={Colors.primary} />
              <Text style={styles.statValue}>₱{stats.totalIncome}</Text>
              <Text style={styles.statLabel}>Gold Earned</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="disc" size={30} color={Colors.mana} />
              <Text style={styles.statValue}>{stats.totalBorrowed}</Text>
              <Text style={styles.statLabel}>Quests Completed</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Toggle Buttons - RPG Style */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, showAvailable && styles.toggleButtonActive]}
            onPress={() => setShowAvailable(true)}
          >
            <Ionicons 
              name="shield" 
              size={20} 
              color={showAvailable ? Colors.background : Colors.primary} 
            />
            <Text style={[styles.toggleText, showAvailable && styles.toggleTextActive]}>
              Available ({totalAvailable})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, !showAvailable && styles.toggleButtonActive]}
            onPress={() => setShowAvailable(false)}
          >
            <Ionicons 
              name="people" 
              size={20} 
              color={!showAvailable ? Colors.background : Colors.secondary} 
            />
            <Text style={[styles.toggleText, !showAvailable && styles.toggleTextActive]}>
              Borrowed ({borrowedGames.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Available Games */}
        {showAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 AVAILABLE GAMES</Text>
            {games.filter(game => game.available > 0).length > 0 ? (
              games.filter(game => game.available > 0).map(game => (
                <Card key={game.id} style={styles.gameCard}>
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
                        <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(game.rating) }]}>
                          <Text style={styles.ratingText}>{game.rating}</Text>
                        </View>
                      </View>
                      
                      <Paragraph style={styles.artist}>{game.artist}</Paragraph>
                      
                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="pricetag" size={12} color={Colors.primary} />
                          <Text style={styles.detailText}>{game.genre}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Ionicons name="calendar" size={12} color={Colors.primary} />
                          <Text style={styles.detailText}>{game.releaseYear}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.availabilityContainer}>
                        <View style={styles.availabilityBar}>
                          <View style={[styles.availabilityFill, { width: `${(game.available / game.quantity) * 100}%` }]} />
                        </View>
                        <Text style={styles.availabilityText}>
                          {game.available}/{game.quantity} copies
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={50} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No games available</Text>
              </View>
            )}
          </View>
        )}

        {/* Borrowed Games */}
        {!showAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚔️ ACTIVE QUESTS</Text>
            {borrowedGames.length > 0 ? (
              borrowedGames.map(item => {
                const overdue = moment().isAfter(item.dueDate);
                return (
                  <Card key={item.borrowId} style={[styles.gameCard, overdue && styles.overdueCard]}>
                    <Card.Content style={styles.gameCardContent}>
                      {games.find(g => g.id === item.cdId)?.image ? (
                        <ExpoImage 
                          source={games.find(g => g.id === item.cdId)?.image} 
                          style={styles.gameImage}
                          contentFit="contain"
                        />
                      ) : (
                        <View style={[styles.gameImage, styles.placeholderImage]}>
                          <Ionicons name="disc" size={40} color={overdue ? Colors.error : Colors.secondary} />
                        </View>
                      )}
                      
                      <View style={styles.gameInfo}>
                        <Title style={[styles.gameTitle, overdue && styles.overdueTitle]}>
                          {item.cdTitle}
                        </Title>
                        
                        <View style={styles.borrowerInfo}>
                          <Ionicons name="person" size={14} color={overdue ? Colors.error : Colors.secondary} />
                          <Text style={[styles.borrowerName, overdue && styles.overdueText]}>
                            {item.borrowerName}
                          </Text>
                        </View>
                        
                        <View style={styles.dateContainer}>
                          <Text style={styles.dateLabel}>Borrowed:</Text>
                          <Text style={styles.dateValue}>
                            {moment(item.borrowDate).format('MMM DD')}
                          </Text>
                        </View>
                        
                        <View style={styles.dateContainer}>
                          <Text style={styles.dateLabel}>Due:</Text>
                          <Text style={[styles.dateValue, overdue && styles.overdueText]}>
                            {moment(item.dueDate).format('MMM DD')}
                          </Text>
                        </View>
                        
                        {item.currentPenalty > 0 && (
                          <View style={styles.penaltyBadge}>
                            <Ionicons name="warning" size={14} color={Colors.error} />
                            <Text style={styles.penaltyText}>Penalty: ₱{item.currentPenalty}</Text>
                          </View>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle" size={50} color={Colors.success} />
                <Text style={styles.emptyText}>No active quests</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gamingHeader: {
    backgroundColor: Colors.surface,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  gamingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  gamingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 0.48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 0,
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
  },
  toggleTextActive: {
    color: Colors.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  gameCard: {
    backgroundColor: Colors.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 0,
  },
  overdueCard: {
    borderColor: Colors.error,
    backgroundColor: '#2A1F1F',
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
  overdueTitle: {
    color: Colors.error,
  },
  ratingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  ratingText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  availabilityContainer: {
    marginTop: 4,
  },
  availabilityBar: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    marginBottom: 4,
  },
  availabilityFill: {
    height: 4,
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  availabilityText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  borrowerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  borrowerName: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: 11,
    color: Colors.text,
  },
  overdueText: {
    color: Colors.error,
  },
  penaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  penaltyText: {
    color: Colors.error,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
});