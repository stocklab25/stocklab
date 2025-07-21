import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faShoePrints,
  faSync,
  faBox,
  faStore,
  faShoppingCart,
  faMoneyBillWave,
  faClipboardList,
  faMoneyBillTransfer,
  faCreditCard,
  faChartLine,
  faUser,
  faCog,
  faBell,
  faSun,
  faMoon,
  faExclamationTriangle,
  faArrowDown,
  faArrowUp,
  faReply,
  faClipboard,
  faPlus,
  faEdit,
  faTrash,
  faArchive,
  faUndo,
  faTimes,
  faSpinner,
  faEllipsisV,
  faGem,
  faChevronDown,
  faChevronRight,
  faSignOutAlt,
  faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';

// Navigation icons
export const DashboardIcon = () => <FontAwesomeIcon icon={faChartBar} />;
export const ProductsIcon = () => <FontAwesomeIcon icon={faShoePrints} />;
export const TransactionsIcon = () => <FontAwesomeIcon icon={faSync} />;
export const InventoryIcon = () => <FontAwesomeIcon icon={faBox} />;
export const StoreInventoryIcon = () => <FontAwesomeIcon icon={faStore} />;
export const StoreSalesIcon = () => <FontAwesomeIcon icon={faShoppingCart} />;
export const AccountingIcon = () => <FontAwesomeIcon icon={faMoneyBillWave} />;
export const PurchaseOrdersIcon = () => <FontAwesomeIcon icon={faClipboardList} />;
export const ExpensesIcon = () => <FontAwesomeIcon icon={faMoneyBillTransfer} />;
export const CardsIcon = () => <FontAwesomeIcon icon={faCreditCard} />;
export const ReportsIcon = () => <FontAwesomeIcon icon={faChartLine} />;
export const ProfileIcon = () => <FontAwesomeIcon icon={faUser} />;
export const SettingsIcon = () => <FontAwesomeIcon icon={faCog} />;

// Header icons
export const BellIcon = () => <FontAwesomeIcon icon={faBell} />;
export const SunIcon = () => <FontAwesomeIcon icon={faSun} />;
export const MoonIcon = () => <FontAwesomeIcon icon={faMoon} />;

// Transaction type icons
export const StockInIcon = () => <FontAwesomeIcon icon={faArrowDown} />;
export const StockOutIcon = () => <FontAwesomeIcon icon={faArrowUp} />;
export const ReturnIcon = () => <FontAwesomeIcon icon={faReply} />;
export const MoveIcon = () => <FontAwesomeIcon icon={faSync} />;
export const AuditIcon = () => <FontAwesomeIcon icon={faClipboard} />;

// Action icons
export const AddIcon = () => <FontAwesomeIcon icon={faPlus} />;
export const EditIcon = () => <FontAwesomeIcon icon={faEdit} />;
export const DeleteIcon = () => <FontAwesomeIcon icon={faTrash} />;
export const ArchiveIcon = () => <FontAwesomeIcon icon={faArchive} />;
export const RestoreIcon = () => <FontAwesomeIcon icon={faUndo} />;
export const CloseIcon = () => <FontAwesomeIcon icon={faTimes} />;
export const LoadingIcon = () => <FontAwesomeIcon icon={faSpinner} className="animate-spin" />;
export const MoreIcon = () => <FontAwesomeIcon icon={faEllipsisV} />;

// Warning icon
export const WarningIcon = () => <FontAwesomeIcon icon={faExclamationTriangle} />;

// Diamond icon
export const DiamondIcon = () => <FontAwesomeIcon icon={faGem} />;

// Chevron icons
export const ChevronDownIcon = () => <FontAwesomeIcon icon={faChevronDown} />;
export const ChevronRightIcon = () => <FontAwesomeIcon icon={faChevronRight} />;

// Logout icon (FontAwesome 6+ uses faRightFromBracket, fallback to faSignOutAlt)
export const LogoutIcon = () => <FontAwesomeIcon icon={faRightFromBracket || faSignOutAlt} />; 