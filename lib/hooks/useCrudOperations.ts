import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export interface CrudOperationState {
  isProcessing: boolean;
  error: string | null;
}

export interface CrudOperationCallbacks<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onConfirm?: () => Promise<boolean>;
}

export const useCrudOperations = <T>() => {
  const [state, setState] = useState<CrudOperationState>({
    isProcessing: false,
    error: null,
  });

  const executeOperation = useCallback(async <R>(
    operation: () => Promise<R>,
    callbacks?: CrudOperationCallbacks<R>
  ): Promise<R | null> => {
    try {
      setState({ isProcessing: true, error: null });
      
      const result = await operation();
      
      setState({ isProcessing: false, error: null });
      callbacks?.onSuccess?.(result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      setState({ isProcessing: false, error: errorMessage });
      callbacks?.onError?.(errorMessage);
      
      return null;
    }
  }, []);

  const confirmOperation = useCallback((
    title: string,
    message: string,
    operation: () => Promise<void>,
    callbacks?: CrudOperationCallbacks<void>
  ) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => executeOperation(operation, callbacks),
        },
      ]
    );
  }, [executeOperation]);

  const showSuccessMessage = useCallback((message: string) => {
    Alert.alert('Success', message);
  }, []);

  const showErrorMessage = useCallback((message: string) => {
    Alert.alert('Error', message);
  }, []);

  return {
    ...state,
    executeOperation,
    confirmOperation,
    showSuccessMessage,
    showErrorMessage,
  };
};
