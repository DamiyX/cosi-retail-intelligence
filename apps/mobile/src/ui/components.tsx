import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { theme } from './theme';

const shared = StyleSheet.create({
  primaryButton: {
    backgroundColor: theme.color.actionPrimary,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: theme.color.raised,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  secondaryButton: {
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.raised,
  },
  secondaryButtonText: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  fieldLabel: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    marginBottom: theme.spacing(1),
  },
  fieldHint: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.small,
    marginTop: theme.spacing(1),
  },
  fieldInput: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(3),
    fontSize: theme.fontSize.body,
    color: theme.color.textPrimary,
  },
  fieldInputInvalid: {
    borderColor: theme.color.statusDanger,
    borderWidth: 2,
  },
  fieldError: {
    color: theme.color.statusDanger,
    fontSize: theme.fontSize.small,
    marginTop: theme.spacing(1),
  },
  errorPanel: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.statusDanger,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  errorTitle: {
    color: theme.color.statusDanger,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
  },
  errorBody: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.small,
    lineHeight: 20,
  },
  emptyPanel: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(6),
    gap: theme.spacing(3),
    alignItems: 'flex-start',
  },
  emptyTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
  },
  emptyBody: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.body,
    lineHeight: 26,
  },
  statusNote: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.small,
  },
});

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function PrimaryButton({ title, onPress, disabled, accessibilityHint }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={[shared.primaryButton, disabled === true && shared.primaryButtonDisabled]}
    >
      <Text style={shared.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
}

export function SecondaryButton({ title, onPress }: SecondaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={shared.secondaryButton}>
      <Text style={shared.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

interface FieldProps extends Pick<TextInputProps, 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'maxLength'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  hint?: string;
  editable?: boolean;
  testID?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  editable,
  testID,
  ...rest
}: FieldProps) {
  const invalid = error !== undefined && error !== null && error.length > 0;
  return (
    <View>
      <Text style={shared.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: editable === false }}
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        testID={testID}
        style={[shared.fieldInput, invalid && shared.fieldInputInvalid]}
        {...rest}
      />
      {invalid ? (
        <Text accessibilityRole="alert" style={shared.fieldError}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={shared.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface ErrorPanelProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorPanel({ title, message, onRetry, onDismiss }: ErrorPanelProps) {
  return (
    <View accessibilityRole="alert" style={shared.errorPanel}>
      <Text style={shared.errorTitle}>{title}</Text>
      <Text style={shared.errorBody}>{message}</Text>
      {onRetry ? <PrimaryButton title="Try again" onPress={onRetry} /> : null}
      {onDismiss ? <SecondaryButton title="Go back" onPress={onDismiss} /> : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  actionTitle: string;
  onAction: () => void;
}

export function EmptyState({ title, body, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View style={shared.emptyPanel}>
      <Text accessibilityRole="header" style={shared.emptyTitle}>
        {title}
      </Text>
      <Text style={shared.emptyBody}>{body}</Text>
      <PrimaryButton title={actionTitle} onPress={onAction} />
    </View>
  );
}

export function StatusNote({ children }: { children: ReactNode }) {
  return <Text style={shared.statusNote}>{children}</Text>;
}
