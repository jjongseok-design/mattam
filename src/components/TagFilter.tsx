import { motion } from "framer-motion";

const POPULAR_TAGS = ["짜장면", "짬뽕", "탕수육", "볶음밥", "군만두", "코스요리", "마라탕"];

interface TagFilterProps {
  activeTags: string[];
  onToggle: (tag: string) => void;
}

const TagFilter = ({ activeTags, onToggle }: TagFilterProps) => {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {POPULAR_TAGS.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <motion.button
            key={tag}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(tag)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent/20"
            }`}
          >
            {tag}
          </motion.button>
        );
      })}
    </div>
  );
};

export default TagFilter;
