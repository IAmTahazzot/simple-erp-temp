import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Svg, { type SvgProps, Path } from 'react-native-svg';

type IconProps = Omit<SvgProps, 'width' | 'height' | 'color'> & {
  size?: number;
  color?: string;
};

export function AddIcon({ size = 24, color, ...svgProps }: IconProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const iconColor = color ?? Colors[colorScheme].icon;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...svgProps}>
      <Path d="M12 16V8" stroke={iconColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <Path d="M14.9902 12H16.0002" stroke={iconColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <Path d="M8 12H11.81" stroke={iconColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <Path d="M12 16V8" stroke={iconColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <Path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke={iconColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}
