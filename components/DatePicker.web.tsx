import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/color';

interface DatePickerProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePicker(props: DatePickerProps) {
  const { value, onChange, minimumDate, maximumDate } = props;

  const handleWebChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onChange(null, date);
  };

  const minDate = minimumDate?.toISOString().split('T')[0];
  const maxDate = maximumDate?.toISOString().split('T')[0];
  const currentValue = value.toISOString().split('T')[0];

  return (
    <View style={styles.webContainer}>
      <input
        type="date"
        value={currentValue}
        onChange={handleWebChange}
        min={minDate}
        max={maxDate}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${Colors.border}`,
          backgroundColor: Colors.card,
          color: Colors.text,
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
    marginVertical: 8,
  },
});