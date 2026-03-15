import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
}

export default function DatePicker(props: DatePickerProps) {
  return <DateTimePicker {...props} />;
}